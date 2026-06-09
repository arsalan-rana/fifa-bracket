import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import NavBar from '../components/NavBar';
import { PHASES, BONUS_QUESTIONS } from '../../data/fifa-2026';

export const metadata = { title: 'How to Play — WC26 Bracket' };

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {icon} {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function HowToPlayPage() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <NavBar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          How to Play
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Everything you need to know to compete in your WC26 bracket league.
        </Typography>

        {/* Overview */}
        <Section title="The Basics" icon="⚽">
          <Typography sx={{ mb: 1.5 }}>
            Before each phase of the tournament, pick the winner of every match. The more you get
            right — and the rarer your correct pick — the more points you earn. The player with the
            most points at the end of the tournament wins your league.
          </Typography>
          <Typography sx={{ mb: 1.5 }}>
            Picks for each phase must be submitted before that phase&apos;s <strong>deadline</strong>.
            You can update your picks any time before the deadline. Once a match kicks off, that pick
            is locked.
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Group stage matches can end in a draw — you can predict a draw as your pick.
            Knockout matches have no draws (goes to extra time / penalties), so you pick one team to win.
          </Typography>
        </Section>

        {/* Scoring */}
        <Section title="Points System" icon="🏆">
          <Typography sx={{ mb: 2 }}>
            <strong>Every phase uses a point pool</strong> — each match has a pool shared among
            everyone in your league who got it right. Rarer picks are worth more: if fewer people
            pick the winner, those that did earn a bigger share. Picking an underdog that comes
            through pays out far more than going with the crowd.
          </Typography>

          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Phase</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Pool per match</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Example (4 correct out of 10)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PHASES.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.icon} {p.name}</TableCell>
                  <TableCell align="right"><strong>{p.poolPoints} pts</strong></TableCell>
                  <TableCell align="right">{Math.round((p.poolPoints ?? 0) / 4)} pts each</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Typography color="text.secondary" variant="body2">
            Pool points are split only among people in <em>your league</em>, not the entire platform.
          </Typography>
        </Section>

        {/* Late penalty */}
        <Section title="Late Picks" icon="⏰">
          <Typography sx={{ mb: 1.5 }}>
            You can still submit picks after the phase deadline, but you&apos;ll incur a{' '}
            <strong>−5 point penalty per day late</strong> for each late pick. Better late than
            never — a late correct pick still scores points (minus the penalty).
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Picks submitted after a match kicks off are considered late by the number of full days
            since the deadline.
          </Typography>
        </Section>

        {/* Chips */}
        <Section title="Power Chips" icon="🎰">
          <Typography sx={{ mb: 2 }}>
            Chips are one-time boosts you can apply to specific matches to supercharge your score.
            Each chip can only be used once per phase.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontSize: '1.4rem' }}>⚡</Typography>
                <Typography sx={{ fontWeight: 700 }}>Double Up</Typography>
                <Chip label="Group + R32" size="small" sx={{ bgcolor: 'rgba(201,167,58,0.15)', color: 'secondary.main', fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Apply to one match before it starts. If your pick is correct, you earn <strong>2× points</strong>
                for that match. If wrong, nothing changes. Available in the Group Stage and Round of 32.
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontSize: '1.4rem' }}>🃏</Typography>
                <Typography sx={{ fontWeight: 700 }}>Wildcard</Typography>
                <Chip label="All phases" size="small" sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#A78BFA', fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Changed your mind? Apply the Wildcard to one match to <strong>change your pick after the deadline</strong>,
                even after the phase has started (as long as the specific match hasn&apos;t kicked off yet).
                Available in every phase.
              </Typography>
            </Box>

          </Box>
        </Section>

        {/* Bonus questions */}
        <Section title="Bonus Questions" icon="⭐">
          <Typography sx={{ mb: 2 }}>
            Before the Group Stage deadline, answer a set of bonus prediction questions about the
            tournament as a whole. These are separate from your match picks and can earn you a
            significant points boost.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Question</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {BONUS_QUESTIONS.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{q.question}</TableCell>
                  <TableCell align="right"><strong>{q.points} pts</strong></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1.5 }}>
            Bonus questions are scored once the official results are known at the end of the tournament.
            Text answers are checked case-insensitively.
          </Typography>
        </Section>

        {/* Phase deadlines */}
        <Section title="Phase Deadlines" icon="📅">
          <Typography sx={{ mb: 2 }}>
            Submit your picks before each deadline. All times are shown in your local timezone.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {PHASES.map((p) => {
              const d = new Date(p.deadline);
              const isPast = d < new Date();
              return (
                <Box
                  key={p.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  <Typography sx={{ fontSize: '1.2rem', width: 28 }}>{p.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                      })}
                    </Typography>
                  </Box>
                  {isPast && <Chip label="Closed" size="small" sx={{ fontSize: '0.65rem', opacity: 0.7 }} />}
                </Box>
              );
            })}
          </Box>
        </Section>

        {/* New features */}
        <Section title="Features to Help You Pick" icon="✨">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>✨ AI Autopick</Typography>
              <Typography variant="body2" color="text.secondary">
                Not sure who to pick? Hit <strong>"Fill with AI Picks"</strong> on the bracket page to
                instantly fill all your empty picks with AI-predicted winners. You can then override
                any picks you disagree with before submitting.
              </Typography>
            </Box>
            <Divider />
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>📊 League Pick Distribution</Typography>
              <Typography variant="body2" color="text.secondary">
                Under each team button you&apos;ll see what percentage of your league picked that team.
                Use it as a guide — or go contrarian and pick the underdog for a bigger pool share if
                you&apos;re right.
              </Typography>
            </Box>
            <Divider />
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>💰 Prize Pool</Typography>
              <Typography variant="body2" color="text.secondary">
                If your league has a prize pool, you&apos;ll need to complete your buy-in payment and
                be verified by the league owner before you can submit picks. Once verified, you
                compete for the prize pot.
              </Typography>
            </Box>
          </Box>
        </Section>

        {/* Tiebreakers */}
        <Section title="Tiebreakers" icon="🤝">
          <Typography sx={{ mb: 1.5 }}>
            If two players finish with the same total points, the following tiebreakers apply in order:
          </Typography>
          <Box component="ol" sx={{ pl: 2.5, m: 0 }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Knockout correct picks</strong> — more correct knockout picks wins
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Bonus question score</strong> — higher bonus points wins
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Fewer late picks</strong> — fewer late submissions wins
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body2">
                <strong>Tied</strong> — shared rank if all tiebreakers are equal
              </Typography>
            </Box>
          </Box>
        </Section>
      </Container>
    </Box>
  );
}
