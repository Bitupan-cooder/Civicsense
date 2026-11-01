package com.campushunt.app

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28])
class TeamCharactersTest {
 @Test fun sixtyCharactersUseDifferentFramesAndOverflowHasAStableBase(){
  val characters=TeamCharacters(RuntimeEnvironment.getApplication())
  val frames=(0 until 60).map { characters.frame(it) }
  assertEquals(60,frames.toSet().size)
  assertTrue(frames.all { it.left>=0&&it.top>=0&&it.right<=640&&it.bottom<=480 })
  assertEquals(characters.frame(0),characters.frame(60));assertEquals(characters.frame(59),characters.frame(119))
 }
}
