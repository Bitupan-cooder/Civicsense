package com.campushunt.app

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.os.SystemClock
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.OverScroller
import org.json.JSONArray
import org.json.JSONObject
import java.util.PriorityQueue
import kotlin.math.*

/** Native offline geographic vectors; WGS84 fixes never use artwork calibration. */
class CampusMapView(context: Context): View(context) {
    private val atlas=JSONObject(context.assets.open("campus_atlas.json").bufferedReader().use { it.readText() })
    private val meta=atlas.getJSONObject("meta")
    val worldWidth=meta.getDouble("width").toFloat()
    val worldHeight=meta.getDouble("height").toFloat()
    private val origin=meta.getJSONArray("utmOrigin")
    private val d=resources.displayMetrics.density
    private val paint=Paint(Paint.ANTI_ALIAS_FLAG)
    private val spritePaint=Paint().apply { isFilterBitmap=false }
    private val characters=TeamCharacters(context)
    private val tree=context.assets.open("atlas_tree.png").use { BitmapFactory.decodeStream(it) }
    private val transform=Matrix();private val inverse=Matrix()
    private val scroller=OverScroller(context)
    private var camera: ValueAnimator?=null
    private var centerX=worldWidth/2;private var centerY=worldHeight/2
    private var zoom=.2f;private var minimum=.02f;private var firstSize=true
    private var point: Pair<Double,Double>?=null
    private var location: JSONObject?=null;private var content: JSONObject?=null
    private var contentKey="";private var eventNodes=emptyList<JSONObject>()
    private var selected: JSONObject?=null;private var route=emptyList<JSONObject>();private var routeKey=""
    var following=true;private set
    val travelling=false
    var viewportTop=0;var viewportBottom=0
    var overviewBackdrop=false
    var controlsHidden=false
    var onMapInteraction: ((Boolean)->Unit)?=null
    var onNodeSelected: ((JSONObject)->Unit)?=null
    var onPlaceGroupSelected: ((List<JSONObject>)->Unit)?=null
    private var opponentSnapshot: JSONObject?=null
    private var opponentServerNow=0L
    private var opponentAnchor=0L
    fun setOpponents(snapshot: JSONObject?,serverNow: Long){opponentSnapshot=snapshot;opponentServerNow=serverNow;opponentAnchor=SystemClock.elapsedRealtime();invalidate()}
    private data class Hit(val rect: RectF,val places: List<JSONObject>)
    private var hits=emptyList<Hit>()
    private data class Area(val path: Path,val color: Int)
    private fun objects(a: JSONArray)=List(a.length()){a.getJSONObject(it)}
    private fun path(g: JSONObject): Path {
        val p=Path().apply { fillType=Path.FillType.EVEN_ODD }
        fun line(a: JSONArray,closed: Boolean) { for(i in 0 until a.length()){val xy=a.getJSONArray(i);if(i==0)p.moveTo(xy.getDouble(0).toFloat(),xy.getDouble(1).toFloat())else p.lineTo(xy.getDouble(0).toFloat(),xy.getDouble(1).toFloat())};if(closed)p.close() }
        fun add(o: JSONObject) { val a=o.optJSONArray("coordinates");when(o.getString("type")) {
            "Polygon"->for(i in 0 until a!!.length())line(a.getJSONArray(i),true)
            "MultiPolygon"->for(i in 0 until a!!.length()){val poly=a.getJSONArray(i);for(j in 0 until poly.length())line(poly.getJSONArray(j),true)}
            "LineString"->line(a!!,false)
            "MultiLineString"->for(i in 0 until a!!.length())line(a.getJSONArray(i),false)
            "GeometryCollection"->objects(o.getJSONArray("geometries")).forEach { add(it) }
        } };add(g);return p
    }
    private val boundary=path(atlas.getJSONObject("boundary"));private val buffer=path(atlas.getJSONObject("buffer"))
    private val colors=mapOf("forest" to "#79A16A","field" to "#D8CA86","water" to "#72BDCA","pitch" to "#B5CD81","land" to "#D2DCB9")
    private val areas=(objects(atlas.getJSONArray("areas"))+objects(atlas.getJSONArray("historical"))).map { Area(path(it.getJSONObject("geometry")),Color.parseColor(colors[it.getString("kind")] ?: "#D2DCB9")) }
    // Batch by material: the full-campus view avoids thousands of roof draw calls.
    private val roofs=Path().apply { objects(atlas.getJSONArray("buildings")).forEach { addPath(path(it.getJSONObject("geometry"))) } }
    private val roads=objects(atlas.getJSONArray("roads")).groupBy { it.optString("highway") }.mapValues { (_,features)->Path().apply { features.forEach { addPath(path(it.getJSONObject("geometry"))) } } }
    private val trees=atlas.getJSONArray("trees")
    private val atlasPlaces=objects(atlas.getJSONArray("places")).map { val xy=it.getJSONObject("geometry").getJSONArray("coordinates");JSONObject(it.toString()).put("kind","landmark").put("x",xy.getDouble(0)).put("y",xy.getDouble(1)) }
    // Signed event coordinates stay intact; unverified old source labels cannot reappear
    // over the reviewed atlas merely because a phone cached an earlier demo package.
    fun places(): List<JSONObject> = (atlasPlaces+eventNodes.filter { it.optBoolean("verified") && it.optString("kind") !in listOf("road_node","hidden") }).distinctBy { it.getString("id") }
    private fun sx()=width/2f
    private fun sy()=viewportTop+(height-viewportTop-viewportBottom).coerceAtLeast(height/4)/2f
    private fun project(lat: Double,lon: Double)=CampusCoordinates.project(lat,lon,origin.getDouble(0),origin.getDouble(1))
    private fun inside(p: Pair<Double,Double>)=p.first in 0.0..worldWidth.toDouble() && p.second in 0.0..worldHeight.toDouble()
    fun contains(lat: Double,lon: Double): Boolean = project(lat,lon)?.let(::inside) ?: false
    private fun eventPlace(p: JSONObject): JSONObject? {
        if(p.isNull("lat") || p.isNull("lon"))return null
        val xy=project(p.optDouble("lat",Double.NaN),p.optDouble("lon",Double.NaN)) ?: return null
        if(!inside(xy))return null
        return JSONObject(p.toString()).put("x",xy.first).put("y",xy.second)
    }
    private val scaler=ScaleGestureDetector(context,object:ScaleGestureDetector.SimpleOnScaleGestureListener(){
        override fun onScaleBegin(v: ScaleGestureDetector): Boolean { onMapInteraction?.invoke(true);scroller.forceFinished(true);camera?.cancel();return true }
        override fun onScale(v: ScaleGestureDetector): Boolean { zoomAt(v.scaleFactor,v.focusX,v.focusY);return true }
    })
    private val gestures=GestureDetector(context,object:GestureDetector.SimpleOnGestureListener(){
        override fun onDown(e: MotionEvent): Boolean { scroller.forceFinished(true);camera?.cancel();return true }
        override fun onScroll(e1: MotionEvent?,e2: MotionEvent,dx: Float,dy: Float): Boolean { onMapInteraction?.invoke(true);if(!scaler.isInProgress){centerX=(centerX+dx/zoom).coerceIn(0f,worldWidth);centerY=(centerY+dy/zoom).coerceIn(0f,worldHeight);following=false;invalidate()};return true }
        override fun onFling(e1: MotionEvent?,e2: MotionEvent,vx: Float,vy: Float): Boolean { if(!scaler.isInProgress){following=false;scroller.fling(centerX.toInt(),centerY.toInt(),(-vx/zoom).toInt(),(-vy/zoom).toInt(),0,worldWidth.toInt(),0,worldHeight.toInt());postInvalidateOnAnimation()};return true }
        override fun onDoubleTap(e: MotionEvent): Boolean { onMapInteraction?.invoke(true);zoomAt(1.8f,e.x,e.y);return true }
        override fun onSingleTapUp(e: MotionEvent): Boolean {
            hits.asReversed().firstOrNull { it.rect.contains(e.x,e.y) }?.let {
                if(it.places.size>1) onPlaceGroupSelected?.invoke(it.places.sortedBy { p->p.getString("name") })
                else { selected=it.places.single();onNodeSelected?.invoke(selected!!);updateRoute();invalidate() }
            };return true
        }
    })
    init { contentDescription="Dibrugarh University vector map with campus and 500 metre surroundings. Pinch or double tap to zoom, drag to explore, tap a landmark for details.";isClickable=true }
    override fun onDetachedFromWindow(){camera?.cancel();scroller.forceFinished(true);super.onDetachedFromWindow()}
    override fun onSizeChanged(w: Int,h: Int,oldw: Int,oldh: Int){minimum=min((w-24*d)/worldWidth,(h-viewportTop-viewportBottom-24*d).coerceAtLeast(h/4f)/worldHeight).coerceAtLeast(.02f);if(firstSize){firstSize=false;zoom=max(minimum,w/(worldWidth*.7f));point?.takeIf(::inside)?.let { centerX=it.first.toFloat();centerY=it.second.toFloat() }}else zoom=zoom.coerceAtLeast(minimum)}
    fun setData(pkg: JSONObject?,active: JSONObject?,fix: JSONObject?){
        val key=pkg?.let { it.optString("event_id")+":"+it.optInt("revision") } ?: "";content=pkg;location=fix
        if(key!=contentKey){contentKey=key;eventNodes=pkg?.optJSONArray("checkpoints")?.let { objects(it).mapNotNull(::eventPlace) } ?: emptyList();routeKey=""}
        point=fix?.let { project(it.optDouble("lat",Double.NaN),it.optDouble("lon",Double.NaN)) }
        if(following)point?.takeIf(::inside)?.let { centerX=it.first.toFloat();centerY=it.second.toFloat() };updateRoute();invalidate()
    }
    private fun updateRoute(){
        val position=point ?: run { route=emptyList();return };val destination=selected ?: run { route=emptyList();return }
        val all=eventNodes.associateBy { it.getString("id") };val adjacency=mutableMapOf<String,MutableList<Pair<String,Double>>>()
        content?.optJSONArray("edges")?.let { a->for(e in objects(a)){if(!e.optBoolean("verified")||e.optString("a") !in all||e.optString("b") !in all||e.optDouble("meters",0.0)<=0)continue;val aa=e.getString("a");val b=e.getString("b");val m=e.getDouble("meters");adjacency.getOrPut(aa){mutableListOf()}.add(b to m);adjacency.getOrPut(b){mutableListOf()}.add(aa to m)} }
        val start=eventNodes.filter { it.getString("id") in adjacency }.minByOrNull { hypot(it.getDouble("x")-position.first,it.getDouble("y")-position.second) }?.getString("id") ?: run { route=emptyList();return }
        val key="$start:${destination.getString("id")}:$contentKey";if(key==routeKey)return;routeKey=key
        val costs=mutableMapOf(start to 0.0);val prev=mutableMapOf<String,String>();val q=PriorityQueue<Pair<String,Double>>(compareBy { it.second });q.add(start to 0.0)
        while(q.isNotEmpty()){val(node,cost)=q.remove();if(cost!=costs[node])continue;for((next,len)in adjacency[node].orEmpty())if(cost+len<(costs[next] ?: Double.POSITIVE_INFINITY)){costs[next]=cost+len;prev[next]=node;q.add(next to cost+len)}}
        var current=destination.getString("id");val result=mutableListOf<JSONObject>();if(current !in costs){route=emptyList();return};while(true){all[current]?.let(result::add);if(current==start)break;current=prev[current] ?: break};route=result.reversed()
    }
    private fun matrix(){transform.reset();transform.postTranslate(-centerX,-centerY);transform.postScale(zoom,zoom);transform.postTranslate(sx(),sy())}
    private fun world(x: Float,y: Float): FloatArray {matrix();transform.invert(inverse);return floatArrayOf(x,y).also {inverse.mapPoints(it)}}
    private fun screen(x: Double,y: Double)=floatArrayOf(x.toFloat(),y.toFloat()).also {transform.mapPoints(it)}
    private fun zoomAt(factor: Float,x: Float,y: Float){val before=world(x,y);zoom=(zoom*factor).coerceIn(minimum,10*d);val after=world(x,y);centerX=(centerX+before[0]-after[0]).coerceIn(0f,worldWidth);centerY=(centerY+before[1]-after[1]).coerceIn(0f,worldHeight);following=false;invalidate()}
    fun zoomBy(factor: Float)=zoomAt(factor,sx(),sy())
    fun fitCampus(){following=false;selected=null;route=emptyList();moveCamera(worldWidth/2,worldHeight/2,minimum)}
    fun recenter(){following=true;point?.takeIf(::inside)?.let {moveCamera(it.first.toFloat(),it.second.toFloat(),max(zoom,.9f*d))}}
    fun north(){invalidate()} // The geographic vector map stays north-up.
    fun heading(value: Float){invalidate()}
    fun showDestination(place: JSONObject){val p=eventPlace(place) ?: return;selected=p;following=false;updateRoute();moveCamera(p.getDouble("x").toFloat(),p.getDouble("y").toFloat(),max(zoom,.8f*d))}
    private fun moveCamera(x: Float,y: Float,z: Float){camera?.cancel();scroller.forceFinished(true);val a=centerX;val b=centerY;val c=zoom;camera=ValueAnimator.ofFloat(0f,1f).apply {duration=420;interpolator=DecelerateInterpolator();addUpdateListener {val f=it.animatedValue as Float;centerX=a+(x-a)*f;centerY=b+(y-b)*f;zoom=c+(z.coerceIn(minimum,10*d)-c)*f;invalidate()};start()}}
    override fun computeScroll(){if(scroller.computeScrollOffset()){centerX=scroller.currX.toFloat();centerY=scroller.currY.toFloat();postInvalidateOnAnimation()}}
    override fun onTouchEvent(event: MotionEvent): Boolean {parent?.requestDisallowInterceptTouchEvent(true);scaler.onTouchEvent(event);gestures.onTouchEvent(event);if(event.actionMasked in listOf(MotionEvent.ACTION_UP,MotionEvent.ACTION_CANCEL)){parent?.requestDisallowInterceptTouchEvent(false);onMapInteraction?.invoke(false)};return true}
    override fun performClick(): Boolean {super.performClick();return true}
    override fun onDraw(c: Canvas){
        c.drawColor(Color.parseColor("#DEE5C6"));matrix();c.save();c.concat(transform);paint.style=Paint.Style.FILL;paint.color=Color.parseColor("#D1DDB0");c.drawPath(buffer,paint);paint.color=Color.parseColor("#DCE6B8");c.drawPath(boundary,paint)
        for(a in areas){paint.color=a.color;c.drawPath(a.path,paint)}
        val left=centerX-width/zoom/2;val right=centerX+width/zoom/2;val top=centerY-height/zoom;val bottom=centerY+height/zoom
        for(i in 0 until trees.length()){val t=trees.getJSONArray(i);val x=t.getDouble(0).toFloat();val y=t.getDouble(1).toFloat();val s=t.getDouble(2).toFloat();if(x in left-s..right+s&&y in top-s..bottom+s)c.drawBitmap(tree,null,RectF(x-s/2,y-s/2,x+s/2,y+s/2),spritePaint)}
        paint.style=Paint.Style.STROKE;paint.strokeJoin=Paint.Join.ROUND;paint.strokeCap=Paint.Cap.ROUND
        for((kind,p)in roads){val w=when(kind){"primary"->13f;"track"->3f;"service"->4f;else->6f};paint.color=Color.parseColor("#A0A17D");paint.strokeWidth=max(w+2.5f,1.7f*d/zoom);c.drawPath(p,paint);paint.color=Color.parseColor("#F7EFD4");paint.strokeWidth=max(w,1f*d/zoom);c.drawPath(p,paint)}
        paint.style=Paint.Style.FILL;paint.color=Color.parseColor("#E0AA83");c.drawPath(roofs,paint);paint.style=Paint.Style.STROKE;paint.strokeWidth=max(.6f,.35f*d/zoom);paint.color=Color.parseColor("#956548");c.drawPath(roofs,paint)
        paint.strokeWidth=1.5f*d/zoom;paint.pathEffect=DashPathEffect(floatArrayOf(5*d/zoom,4*d/zoom),0f);paint.color=Color.parseColor("#D66643");c.drawPath(boundary,paint);paint.color=Color.argb(150,67,142,171);c.drawPath(buffer,paint);paint.pathEffect=null
        if(route.size>1){val p=Path();route.forEachIndexed {i,n->if(i==0)p.moveTo(n.getDouble("x").toFloat(),n.getDouble("y").toFloat())else p.lineTo(n.getDouble("x").toFloat(),n.getDouble("y").toFloat())};paint.color=Color.WHITE;paint.strokeWidth=7*d/zoom;c.drawPath(p,paint);paint.color=Color.parseColor("#3A8790");paint.strokeWidth=4*d/zoom;c.drawPath(p,paint)}
        point?.takeIf(::inside)?.let {p->val acc=location?.optDouble("accuracy",0.0) ?: 0.0;if(acc.isFinite()&&acc in 0.0..10000.0){paint.style=Paint.Style.FILL;paint.color=Color.argb(35,50,104,190);c.drawCircle(p.first.toFloat(),p.second.toFloat(),acc.toFloat(),paint);paint.style=Paint.Style.STROKE;paint.color=Color.argb(130,50,104,190);paint.strokeWidth=d/zoom;c.drawCircle(p.first.toFloat(),p.second.toFloat(),acc.toFloat(),paint)}}
        c.restore();paint.style=Paint.Style.FILL
        // Expanded panels own the screen; map labels would compete with their text.
        if(overviewBackdrop) { hits=emptyList();c.drawColor(Color.argb(65,21,13,40));return }
        drawPlaces(c)
        opponentSnapshot?.let { opponents->
            val points=opponents.optJSONArray("points")
            if(points!=null)for(i in 0 until points.length()){
                val rival=points.getJSONObject(i);val p=project(rival.optDouble("lat"),rival.optDouble("lon")) ?: continue
                if(!inside(p))continue;val xy=screen(p.first,p.second)
                val age=opponentServerNow+SystemClock.elapsedRealtime()-opponentAnchor-rival.optLong("as_of")
                if(age>300000)continue
                val old=rival.optBoolean("stale")||age>if(opponents.optString("mode")=="live")30000 else 75000
                val radius=rival.optDouble("radius_m",100.0).takeIf { it.isFinite()&&it in 0.0..10000.0 } ?: 100.0
                paint.color=Color.argb(35,143,94,190);c.drawCircle(xy[0],xy[1],(radius*zoom).toFloat().coerceAtLeast(4*d),paint)
                characters.draw(c,rival.optInt("avatar_id"),xy[0],xy[1],d,old)
                paint.color=Color.parseColor(if(old)"#666477" else "#422966")
                paint.textAlign=Paint.Align.CENTER;paint.textSize=10*d
                val label=rival.optString("name","Team").take(32)
                c.drawText(label,xy[0],xy[1]+19*d,paint)
                paint.textSize=9*d;c.drawText(if(old)"Last seen ${(age/60000).coerceAtLeast(1)} min ago" else if(opponents.optString("mode")=="live")"Nearby team" else "Around here",xy[0],xy[1]+32*d,paint)
            }
        }
        point?.takeIf(::inside)?.let {p->val xy=screen(p.first,p.second);val x=xy[0];val y=xy[1];paint.color=Color.argb(65,30,58,48);c.drawOval(x-15*d,y-4*d,x+15*d,y+6*d,paint);characters.draw(c,content?.optInt("avatar_id")?:0,x,y+(sin(SystemClock.uptimeMillis()/350.0)*d).toFloat(),d);paint.textAlign=Paint.Align.CENTER;paint.textSize=10*d;val label=content?.optString("team_name","Your team")?.take(32)?:"Your team";val half=paint.measureText(label)/2+8*d;paint.color=Color.parseColor("#1C4140");c.drawRoundRect(x-half,y+9*d,x+half,y+29*d,7*d,7*d,paint);paint.color=Color.WHITE;c.drawText(label,x,y+23*d,paint)}
        paint.shader=LinearGradient(0f,0f,24*d,0f,Color.argb(120,225,237,216),Color.TRANSPARENT,Shader.TileMode.CLAMP);c.drawRect(0f,0f,24*d,height.toFloat(),paint);paint.shader=LinearGradient(width.toFloat(),0f,width-24*d,0f,Color.argb(120,225,237,216),Color.TRANSPARENT,Shader.TileMode.CLAMP);c.drawRect(width-24*d,0f,width.toFloat(),height.toFloat(),paint);paint.shader=null
        if(isShown&&point!=null)postInvalidateDelayed(200)
    }
    private fun drawPlaces(c: Canvas) {
        val all=places().associateBy { it.getString("id") };val selectedId=selected?.optString("id")
        val visible=all.values.mapNotNull { p->val xy=screen(p.getDouble("x"),p.getDouble("y"));
            if(xy[0] !in 0f..width.toFloat() || xy[1] !in (if(controlsHidden)0f else viewportTop.toFloat())..(if(controlsHidden)height.toFloat() else (height-viewportBottom).toFloat()))null
            else MapLabels.Point(p.getString("id"),xy[0],xy[1],if(p.optString("id")==selectedId)1000 else p.optInt("priority",50)) }
        val groups=MapLabels.groups(visible,40*d);val occupied=mutableListOf<RectF>();val currentHits=mutableListOf<Hit>()
        paint.textSize=11*d;paint.typeface=Typeface.create("sans-serif-medium",Typeface.NORMAL);paint.textAlign=Paint.Align.LEFT
        for(g in groups) {
            val p=all.getValue(g.anchor.id);val members=g.members.map { all.getValue(it.id) };val x=g.anchor.x;val y=g.anchor.y;val isSelected=g.anchor.id==selectedId
            paint.style=Paint.Style.FILL;paint.color=Color.parseColor(if(isSelected)"#9B62C4" else "#2B6049")
            c.drawCircle(x,y,(if(members.size>1)11 else 4)*d,paint)
            if(members.size>1){paint.color=Color.WHITE;paint.textAlign=Paint.Align.CENTER;paint.textSize=10*d;c.drawText(members.size.toString(),x,y+3.5f*d,paint);paint.textAlign=Paint.Align.LEFT;paint.textSize=11*d}
            currentHits.add(Hit(RectF(x-18*d,y-18*d,x+18*d,y+18*d),members))
            val name=if(isSelected || zoom>=1.2f*d)p.getString("name") else p.optString("display_name",p.getString("name"))
            val words=(name+if(members.size>1)" +${members.size-1}" else "").split(' ');val lines=mutableListOf("")
            for(word in words){val trial=(lines.last()+" "+word).trim();if(paint.measureText(trial)>150*d && lines.last().isNotEmpty())lines.add(word)else lines[lines.lastIndex]=trial}
            val tw=lines.maxOf { paint.measureText(it) };val h=lines.size*14*d+8*d;val w=tw+12*d
            val candidates=listOf(14*d to -h/2,14*d to -h-10*d,14*d to 10*d,-w-14*d to -h/2,-w-14*d to -h-10*d,-w-14*d to 10*d,-w/2 to -h-16*d,-w/2 to 16*d)
            var box=candidates.map { (dx,dy)->RectF(x+dx,y+dy,x+dx+w,y+dy+h) }.firstOrNull { b->b.left>=6*d&&b.right<=width-6*d&&b.top>=viewportTop&&b.bottom<=height-viewportBottom&&occupied.none { RectF.intersects(it,b) }&&groups.none { other->other!==g&&other.anchor.x>b.left-12*d&&other.anchor.x<b.right+12*d&&other.anchor.y>b.top-12*d&&other.anchor.y<b.bottom+12*d } }
            if(box==null && isSelected) { val left=(x+14*d).coerceIn(6*d,max(6*d,width-w-6*d));val top=(y-h/2).coerceIn(viewportTop.toFloat(),max(viewportTop.toFloat(),height-viewportBottom-h));box=RectF(left,top,left+w,top+h) }
            if(box==null) continue
            occupied.add(RectF(box).apply { inset(-3*d,-3*d) });paint.color=Color.argb(160,45,77,53);paint.strokeWidth=d
            c.drawLine(x,y,box.centerX().coerceIn(box.left,box.right),box.centerY(),paint)
            paint.color=Color.argb(240,255,253,236);c.drawRoundRect(box,5*d,5*d,paint);paint.color=Color.parseColor("#264D38")
            lines.forEachIndexed { i,line->c.drawText(line,box.left+6*d,box.top+(i*14+15)*d,paint) }
            currentHits.add(Hit(box,members))
        };hits=currentHits
    }
}
