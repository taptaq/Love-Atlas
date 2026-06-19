import type { DiscoveryItem, Language } from '../../types';

const en: Record<string, [string, string]> = {
  event_mirror_01: ['Start truly listening to each other', 'Understanding and expression are not always the same.'],
  event_mirror_02: ['Seeing from the other side', 'The moment you answer for each other, the difference becomes visible.'],
  event_switch_01: ['A different angle', 'It is not about right or wrong, but difference.'],
  event_switch_02: ['A gap in understanding', 'Thinking you understand can sometimes be your own imagination.'],
  event_moment_01: ['Today was carefully recorded', 'This moment has been kept.'],
  event_moment_02: ['This moment left a trace', 'Every uploaded image is a small freeze-frame.'],
  event_memory_01: ['The past was brought up again', 'Some words had not been spoken for a long time.'],
  event_memory_02: ['The first closeness', 'You still remember when closeness first appeared.'],
  event_future_01: ['First talk about later', 'The future begins to take shape.'],
  event_future_02: ['Your futures are aligning', 'Your imagined futures begin to overlap.'],
  event_silence_01: ['Silence is also a conversation', 'Thirty quiet seconds can also bring you closer.'],
  event_silence_02: ['Hearing each other in quiet', 'Silent moments can still contain a lot.'],
  region_forest_01: ['Starting to express', 'Some feelings were spoken today.'],
  region_forest_02: ['Deep in Emotion Forest', 'Deeper feelings were brought up.'],
  region_coast_01: ['The past resurfaced', 'Memories from the coast returned.'],
  region_coast_02: ['Echoes from the coast', 'Some things had not been mentioned together for a long time.'],
  region_valley_01: ['Daily life deserves to be seen', 'The ordinary days you share are precious too.'],
  region_valley_02: ['The rhythm of life', 'Daily rhythm quietly brings you closer.'],
  region_city_01: ['The future became concrete', 'Your imagination of the future gained shape.'],
  region_city_02: ['A shared direction', 'You began imagining the future together.'],
  region_garden_01: ['Beginning to discuss differences', 'Boundaries can also be explored together.'],
  region_garden_02: ['The garden is changing', 'The lines between you are slowly adjusting.'],
  journey_short_01: ['Today did not end too quickly', 'Even a light two-question journey can carry weight.'],
  journey_normal_01: ['A complete everyday conversation', 'A three-question daily exploration was completed.'],
  journey_deep_01: ['Deeper than usual', 'A five-question deep exploration is a rare kind of seriousness.'],
  journey_guess_mismatch_01: ['A new understanding appeared', 'What you assumed was not exactly what they thought.'],
  journey_guess_match_01: ['You guessed together', 'Some things are surprisingly similar in your minds.'],
  journey_long_answers_01: ['The first sincere answer', 'The answer was longer and more honest than usual.'],
  journey_multi_answers_01: ['Complete answers', 'Both of you wrote something down.'],
  journey_first_complete_01: ['First complete journey', 'You finished your first full exploration together.'],
  journey_5_complete_01: ['The fifth completion', 'You have had five serious conversations now.'],
  journey_10_complete_01: ['The tenth completion', 'Ten complete explorations have accumulated.'],
  journey_multi_regions_01: ['Different places visited', 'You entered multiple different regions.'],
  journey_all_regions_01: ['Every region has been visited', 'All five regions now hold traces of you.'],
  journey_with_event_01: ['An event changed the rhythm', 'This journey had a turning point.'],
  journey_3_event_01: ['Several turning points', 'You have triggered three events already.'],
  journey_keep_explore_01: ['Continued closeness', 'You have been exploring each other recently.'],
  special_first_upload_01: ['The one who recorded this moment', 'A photo of the present moment was uploaded for the first time.'],
  special_mirror_3_01: ['Trying to stand on the other side', 'Mirror events have accumulated three times.'],
  special_coast_3_01: ['Familiar things can still change', 'Memory Coast has been explored three times.'],
  special_night_01: ['A night for honest words', 'An exploration was completed late at night.'],
  special_deep_journey_01: ['A serious conversation', 'One deep five-question journey was completed.'],
  special_long_answers_01: ['A long answer', 'One answer was especially sincere.'],
  special_emotion_forest_01: ['A frequent visitor to Emotion Forest', 'You have entered Emotion Forest many times.'],
  special_full_circle_01: ['A full circle', 'Every type of exploration has been tried.'],
};

export function getDiscoveryCopy(item: DiscoveryItem, language: Language): Pick<DiscoveryItem, 'title' | 'message'> {
  if (language === 'en' && en[item.id]) {
    return { title: en[item.id][0], message: en[item.id][1] };
  }
  return { title: item.title, message: item.message };
}
