package com.campushunt.app

import kotlin.math.*

/** WGS84 -> UTM 46N in metres. Independent of the previous illustrated map. */
object CampusCoordinates {
    fun utm(latitude: Double,longitude: Double): Pair<Double,Double>? {
        if(!latitude.isFinite() || !longitude.isFinite() || latitude !in 0.0..84.0 || longitude !in 90.0..96.0) return null
        val a=6378137.0;val e2=0.0066943799901413165;val ep=e2/(1-e2);val k=.9996
        val p=Math.toRadians(latitude);val l=Math.toRadians(longitude-93.0)
        val n=a/sqrt(1-e2*sin(p).pow(2));val t=tan(p).pow(2);val c=ep*cos(p).pow(2);val aa=cos(p)*l
        val m=a*((1-e2/4-3*e2.pow(2)/64-5*e2.pow(3)/256)*p
            -(3*e2/8+3*e2.pow(2)/32+45*e2.pow(3)/1024)*sin(2*p)
            +(15*e2.pow(2)/256+45*e2.pow(3)/1024)*sin(4*p)
            -(35*e2.pow(3)/3072)*sin(6*p))
        val east=k*n*(aa+(1-t+c)*aa.pow(3)/6+(5-18*t+t*t+72*c-58*ep)*aa.pow(5)/120)+500000
        val north=k*(m+n*tan(p)*(aa*aa/2+(5-t+9*c+4*c*c)*aa.pow(4)/24+(61-58*t+t*t+600*c-330*ep)*aa.pow(6)/720))
        return east to north
    }
    fun project(latitude: Double,longitude: Double,originEast: Double,originNorth: Double): Pair<Double,Double>? =
        utm(latitude,longitude)?.let { (it.first-originEast) to (originNorth-it.second) }
}
