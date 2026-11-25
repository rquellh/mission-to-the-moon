/**
 * The recording of Apollo 11's landing ("The Eagle has landed", 15
 * seconds): the whole player in "Tell me more", and "Listen" on the card,
 * which share one recording. Sound is the edge here: the test
 * plays the part of the speakers with `sound` (it starts, plays on, ends,
 * or does not load).
 */
import { describe, expect, it } from 'vitest';
import { story as apollo11 } from '../content/missions/apollo-11/story.ts';
import type { AudioClip } from '../content/types.ts';
import { mountMission, mountRecordings, screen, sound, within } from '../test/test-utils.ts';

function clipOf(eventId: string): AudioClip {
  const clip = apollo11.events.find((event) => event.id === eventId)?.audio;
  if (!clip) throw new Error(`Apollo 11's ${eventId} has no recording`);
  return clip;
}

const theCard = (): HTMLElement => screen.getByRole('region', { name: 'What is happening' });

/** The landing, with "Tell me more" open on its recording. */
async function atTheLanding() {
  const mounted = await mountMission('apollo-11', { event: 'landing' });
  await mounted.user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));
  const records = screen.getByRole('region', { name: 'The Eagle has landed' });
  return {
    ...mounted,
    records,
    recording: within(records).getByRole('region', { name: 'Recording' }),
  };
}

describe('the recording player', () => {
  describe('playing', () => {
    it('loads the recording, then plays it', async () => {
      const { user, recording } = await atTheLanding();
      expect(within(recording).getByText('0:15')).toBeInTheDocument();

      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );

      const toggle = within(recording).getByRole('button', { name: 'Pause the recording' });
      expect(toggle).toHaveTextContent('Loading…');

      sound.starts();

      expect(toggle).toHaveTextContent('Pause');
      expect(within(recording).getByRole('status')).toHaveTextContent('Playing the recording.');
      expect(within(recording).getByText('0:00 / 0:15')).toBeInTheDocument();

      sound.reaches(6);

      expect(within(recording).getByText('0:06 / 0:15')).toBeInTheDocument();
    });

    it('pauses and plays on from there', async () => {
      const { user, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();
      sound.reaches(6);

      await user.click(within(recording).getByRole('button', { name: 'Pause the recording' }));

      expect(within(recording).getByRole('status')).toHaveTextContent('Recording paused.');
      expect(within(recording).getByText('0:06 / 0:15')).toBeInTheDocument();

      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      expect(within(recording).getByRole('status')).toHaveTextContent('Playing the recording.');
      expect(within(recording).getByText('0:06 / 0:15')).toBeInTheDocument();
    });

    it('goes back to the start when the recording ends', async () => {
      const { user, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      sound.ends();

      expect(within(recording).getByRole('status')).toHaveTextContent('The recording has ended.');
      expect(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      ).toHaveTextContent('Hear the recording');
      expect(within(recording).getByText('0:15')).toBeInTheDocument();
    });
  });

  describe('one recording, two buttons', () => {
    it("plays from the card's button, and shows it playing in Tell me more too", async () => {
      const { user, recording } = await atTheLanding();

      await user.click(
        within(theCard()).getByRole('button', { name: 'Listen to the recording, 15 seconds' }),
      );

      // The card's short button says Pause at once, while the file loads: what pressing it again does.
      expect(
        within(theCard()).getByRole('button', { name: 'Pause the recording' }),
      ).toHaveTextContent('Pause');

      sound.starts();

      expect(
        within(theCard()).getByRole('button', { name: 'Pause the recording' }),
      ).toHaveTextContent('Pause');
      expect(within(theCard()).getByRole('status')).toHaveTextContent('Playing the recording.');
      expect(
        within(recording).getByRole('button', { name: 'Pause the recording' }),
      ).toBeInTheDocument();
      // Said once, beside the button pressed.
      expect(within(recording).getByRole('status')).toBeEmptyDOMElement();
    });

    it('pauses from either button', async () => {
      const { user, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      await user.click(within(theCard()).getByRole('button', { name: 'Pause the recording' }));

      expect(within(theCard()).getByRole('status')).toHaveTextContent('Recording paused.');
      expect(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      ).toBeInTheDocument();
    });

    it('keeps playing when Tell me more closes', async () => {
      const { user, records, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      await user.click(within(records).getByRole('button', { name: 'Show less' }));

      expect(
        screen.queryByRole('region', { name: 'The Eagle has landed' }),
      ).not.toBeInTheDocument();
      const cardButton = within(theCard()).getByRole('button', { name: 'Pause the recording' });
      expect(cardButton).toHaveTextContent('Pause');

      sound.reaches(6);

      expect(cardButton).toHaveTextContent('0:06 / 0:15');
    });
  });

  describe('failing to load', () => {
    it('says the recording did not load, and tries again on Play', async () => {
      const { user, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );

      sound.fails();

      expect(within(recording).getByRole('status')).toHaveTextContent(
        'The recording did not load. Press Play to try again.',
      );

      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );

      expect(
        within(recording).getByRole('button', { name: 'Pause the recording' }),
      ).toHaveTextContent('Loading…');
    });
  });

  describe('one at a time', () => {
    it('pauses one recording when another starts', async () => {
      const { user } = mountRecordings(clipOf('landing'), clipOf('first-step'));
      const [landing, firstStep] = screen.getAllByRole('region', { name: 'Recording' });
      await user.click(
        within(landing!).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      await user.click(
        within(firstStep!).getByRole('button', { name: 'Hear the recording, 10 seconds' }),
      );

      expect(within(landing!).getByRole('status')).toHaveTextContent('Recording paused.');
      expect(
        within(firstStep!).getByRole('button', { name: 'Pause the recording' }),
      ).toBeInTheDocument();
    });

    it('pauses when the mission list opens over the card', async () => {
      const { user, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      await user.click(screen.getByRole('button', { name: /all missions$/ }));

      expect(within(recording).getByRole('status')).toHaveTextContent('Recording paused.');
    });

    it("gives way to the next event's recording when the card moves on", async () => {
      const { user, recording } = await atTheLanding();
      await user.click(
        within(recording).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();
      await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));

      await user.click(screen.getByRole('button', { name: 'Next event' }));

      expect(recording).not.toBeInTheDocument();
      const next = within(screen.getByRole('region', { name: 'First step on the Moon' })).getByRole(
        'region',
        {
          name: 'Recording',
        },
      );
      expect(
        within(next).getByRole('button', { name: 'Hear the recording, 10 seconds' }),
      ).toBeInTheDocument();
      expect(
        within(theCard()).getByRole('button', { name: 'Listen to the recording, 10 seconds' }),
      ).toBeInTheDocument();
    });
  });
});
