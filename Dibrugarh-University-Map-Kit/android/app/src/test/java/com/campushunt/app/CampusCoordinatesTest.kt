package com.campushunt.app

import org.junit.Assert.*
import org.junit.Test

class CampusCoordinatesTest {
    @Test fun nativeProjectionMatchesIndependentProjAtEverySourcePlace() {
        val input=requireNotNull(javaClass.getResourceAsStream("/projection-fixtures.json")).bufferedReader().use { it.readText() }
        val rows=Regex("\\[([^\\[\\]]+)\\]").findAll(input).map { match->match.groupValues[1].split(',').map { it.trim().toDouble() } }.toList()
        assertEquals(91,rows.size)
        for(row in rows){val actual=requireNotNull(CampusCoordinates.utm(row[0],row[1]));assertEquals(row[2],actual.first,.02);assertEquals(row[3],actual.second,.02)}
    }
    @Test fun invalidAndUnrelatedCoordinatesCannotBecomeCampusPositions() {
        assertNull(CampusCoordinates.utm(Double.NaN,94.9));assertNull(CampusCoordinates.utm(94.9,27.45));assertNull(CampusCoordinates.utm(27.4,-74.0));assertNull(CampusCoordinates.utm(27.4,Double.POSITIVE_INFINITY))
        val utm=requireNotNull(CampusCoordinates.utm(27.44925,94.89659))
        val local=requireNotNull(CampusCoordinates.project(27.44925,94.89659,utm.first-100,utm.second+200))
        assertEquals(100.0,local.first,.000001);assertEquals(200.0,local.second,.000001)
    }
}
