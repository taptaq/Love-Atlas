import type { DiscoveryItem, Language } from '../../types';

// [title, message, hint]
const en: Record<string, [string, string, string]> = {
  event_switch_01: ['A different angle', 'It is not about right or wrong, but difference.', 'When you choose to switch angles...'],
  event_switch_02: ['A gap in understanding', 'Thinking you understand can sometimes be your own imagination.', 'Once more, seeing each other from another side.'],
  event_moment_01: ['Today was carefully recorded', 'This moment has been kept.', 'When this moment is carefully recorded.'],
  event_moment_02: ['This moment left a trace', 'Every uploaded image is a small freeze-frame.', 'Again, a moment is preserved.'],
  event_memory_01: ['The past was brought up again', 'Some words had not been spoken for a long time.', 'When old times are mentioned again.'],
  event_memory_02: ['The first closeness', 'You still remember when closeness first appeared.', 'Returning once more to that first closeness.'],
  event_future_01: ['First talk about later', 'The future begins to take shape.', 'When you first talk about the future.'],
  event_future_02: ['Your futures are aligning', 'Your imagined futures begin to overlap.', 'When your visions of the future begin to overlap.'],
  event_silence_01: ['Silence is also a conversation', 'Thirty quiet seconds can also bring you closer.', 'When silence itself becomes closeness.'],
  event_silence_02: ['Hearing each other in quiet', 'Silent moments can still contain a lot.', 'Again, hearing each other in the quiet.'],

  region_forest_01: ['Starting to express', 'Some feelings were spoken today.', 'The first step into Emotion Forest.'],
  region_forest_02: ['Deep in Emotion Forest', 'Deeper feelings were brought up.', 'Stepping deeper into Emotion Forest once more.'],
  region_coast_01: ['The past resurfaced', 'Memories from the coast returned.', 'Memories carried back from the coast.'],
  region_coast_02: ['Echoes from the coast', 'Some things had not been mentioned together for a long time.', 'Hearing the echo of the coast once more.'],
  region_valley_01: ['Daily life deserves to be seen', 'The ordinary days you share are precious too.', 'Stepping into Life Valley.'],
  region_valley_02: ['The rhythm of life', 'Daily rhythm quietly brings you closer.', 'Feeling the rhythm of life once more.'],
  region_city_01: ['The future became concrete', 'Your imagination of the future gained shape.', 'Future City begins to take shape.'],
  region_city_02: ['A shared direction', 'You began imagining the future together.', 'Once more, imagining the future together.'],
  region_garden_01: ['Beginning to discuss differences', 'Boundaries can also be explored together.', 'Stepping into Boundary Garden.'],
  region_garden_02: ['The garden is changing', 'The lines between you are slowly adjusting.', 'The boundaries in the garden are shifting.'],

  journey_short_01: ['Today did not end too quickly', 'Even a light two-question journey can carry weight.', 'Complete a light, brief conversation.'],
  journey_normal_01: ['A complete everyday conversation', 'A three-question daily exploration was completed.', 'Complete an everyday exploration.'],
  journey_deep_01: ['Deeper than usual', 'A five-question deep exploration is a rare kind of seriousness.', 'A rare, deep journey.'],
  journey_guess_mismatch_01: ['A new understanding appeared', 'What you assumed was not exactly what they thought.', 'When understanding takes a new angle.'],
  journey_guess_match_01: ['You guessed together', 'Some things are surprisingly similar in your minds.', 'When you both guess the same thing.'],
  journey_long_answers_01: ['The first sincere answer', 'The answer was longer and more honest than usual.', 'When an answer is more sincere than usual.'],
  journey_multi_answers_01: ['Complete answers', 'Both of you wrote something down.', 'When both of you put feelings into words.'],
  journey_first_complete_01: ['First complete journey', 'You finished your first full exploration together.', 'Walking a full journey for the first time.'],
  journey_5_complete_01: ['The fifth completion', 'You have had five serious conversations now.', 'A marker for your fifth serious talk.'],
  journey_10_complete_01: ['The tenth completion', 'Ten complete explorations have accumulated.', 'The imprint of your tenth exploration.'],
  journey_multi_regions_01: ['Different places visited', 'You entered multiple different regions.', 'When you have traveled through different places.'],
  journey_all_regions_01: ['Every region has been visited', 'All five regions now hold traces of you.', 'When all five regions bear your traces.'],
  journey_with_event_01: ['An event changed the rhythm', 'This journey had a turning point.', 'When a journey takes a turn.'],
  journey_3_event_01: ['Several turning points', 'You have triggered three events already.', 'When turning points appear more than once.'],
  journey_keep_explore_01: ['Continued closeness', 'You have been exploring each other recently.', 'When you keep moving closer.'],

  special_first_upload_01: ['The one who recorded this moment', 'A photo of the present moment was uploaded for the first time.', 'A hidden achievement about recording.'],
  special_coast_3_01: ['Familiar things can still change', 'Memory Coast has been explored three times.', 'What a frequent visitor to the coast leaves behind.'],
  special_night_01: ['A night for honest words', 'An exploration was completed late at night.', 'Late nights are good for honest words.'],
  special_deep_journey_01: ['A serious conversation', 'One deep five-question journey was completed.', 'A rare, earnest conversation.'],
  special_long_answers_01: ['A long answer', 'One answer was especially sincere.', 'One especially long answer.'],
  special_emotion_forest_01: ['A frequent visitor to Emotion Forest', 'You have entered Emotion Forest many times.', 'A frequent visitor of Emotion Forest.'],
  special_full_circle_01: ['A full circle', 'Every type of exploration has been tried.', 'When every kind of exploration has been tried.'],
};

export interface DiscoveryCopy {
  title: string;
  message: string;
  hint: string;
}

export function getDiscoveryCopy(item: DiscoveryItem, language: Language): DiscoveryCopy {
  if (language === 'en' && en[item.id]) {
    const [title, message, hint] = en[item.id];
    return { title, message, hint };
  }
  return { title: item.title, message: item.message, hint: item.hint };
}
