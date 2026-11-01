package com.campushunt.app

import android.content.Context
import android.graphics.*

/** The same 60 original pixel characters are shared with the organizer map. */
class TeamCharacters(context: Context) {
 private val sheet=context.assets.open("team_characters.webp").use { BitmapFactory.decodeStream(it) }
 private val paint=Paint().apply { isFilterBitmap=false }
 internal fun frame(id: Int): Rect {val n=id.coerceAtLeast(0)%60;return Rect(n%10*64,n/10*80,n%10*64+64,n/10*80+80)}
 fun draw(canvas: Canvas,id: Int,x: Float,y: Float,d: Float,old: Boolean=false) {
  paint.alpha=if(old)130 else 255
  canvas.drawBitmap(sheet,frame(id),RectF(x-24*d,y-52*d,x+24*d,y+8*d),paint)
  if(id>=60){paint.color=Color.WHITE;paint.textSize=9*d;paint.textAlign=Paint.Align.CENTER;canvas.drawText("${id/60+1}",x+15*d,y,paint)}
  paint.alpha=255
 }
}
