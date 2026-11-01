package com.campushunt.app

/** Screen-space grouping keeps every place reachable, including co-located departments. */
object MapLabels {
    data class Point(val id: String,val x: Float,val y: Float,val priority: Int=0)
    data class Group(val anchor: Point,val members: MutableList<Point>)
    fun groups(points: List<Point>,radius: Float): List<Group> {
        require(radius.isFinite() && radius>0)
        val result=mutableListOf<Group>()
        for(p in points.filter { it.x.isFinite() && it.y.isFinite() }.distinctBy { it.id }.sortedWith(compareByDescending<Point> { it.priority }.thenBy { it.id })) {
            val group=result.firstOrNull { val dx=p.x-it.anchor.x;val dy=p.y-it.anchor.y;dx*dx+dy*dy<=radius*radius }
            if(group==null) result.add(Group(p,mutableListOf(p))) else group.members.add(p)
        }
        return result
    }
}
