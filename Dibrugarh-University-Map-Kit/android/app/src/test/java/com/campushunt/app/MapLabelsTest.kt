package com.campushunt.app
import org.junit.Assert.*
import org.junit.Test

class MapLabelsTest {
    @Test fun noDepartmentIsLostWhenItsPinOverlapsAnother() {
        val points=listOf(MapLabels.Point("history",10f,10f),MapLabels.Point("assamese",10f,10f),MapLabels.Point("chemistry",130f,100f))
        val groups=MapLabels.groups(points,42f)
        assertEquals(2,groups.size)
        assertEquals(points.map { it.id }.toSet(),groups.flatMap { it.members }.map { it.id }.toSet())
        assertTrue(groups.any { it.members.map { p->p.id }.toSet()==setOf("history","assamese") })
    }
    @Test fun zoomSeparatesNearbyPlacesWithoutMovingTheirCoordinates() {
        val points=(0..5).map { MapLabels.Point("$it",it*25f,10f) }
        val overview=MapLabels.groups(points,42f)
        val close=MapLabels.groups(points.map { it.copy(x=it.x*4,y=it.y*4) },42f)
        assertTrue(close.size>overview.size);assertEquals(points.size,close.size)
        assertTrue(overview.all { it.anchor in points });assertEquals(25f,points[1].x,0f)
    }
    @Test fun selectedPriorityAndGroupingAreStableAcrossInputOrder() {
        val points=listOf(MapLabels.Point("other",1f,0f),MapLabels.Point("selected",0f,0f,1000),MapLabels.Point("next",200f,0f))
        assertEquals(MapLabels.groups(points,42f),MapLabels.groups(points.reversed(),42f))
        assertEquals("selected",MapLabels.groups(points,42f).first().anchor.id)
    }
    @Test fun invalidPointsAndDuplicateIdsCannotCorruptHitTargets() {
        val groups=MapLabels.groups(listOf(MapLabels.Point("a",0f,0f),MapLabels.Point("a",0f,0f),MapLabels.Point("bad",Float.NaN,0f)),42f)
        assertEquals(listOf("a"),groups.flatMap { it.members }.map { it.id })
    }
}
