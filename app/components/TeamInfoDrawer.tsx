'use client';

import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import { TEAMS } from '../../data/fifa-2026';
import { getTeamProfile, type Player } from '../../data/team-profiles';

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;
const POS_LABELS: Record<string, string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

function SquadSection({ pos, players }: { pos: string; players: Player[] }) {
  if (players.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {POS_LABELS[pos]}
      </Typography>
      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {players.map((p) => (
          <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', maxWidth: '45%' }}>{p.club}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface Props {
  teamCode: string | null;
  onClose: () => void;
}

export default function TeamInfoDrawer({ teamCode, onClose }: Props) {
  const team = teamCode ? TEAMS[teamCode] : null;
  const profile = teamCode ? getTeamProfile(teamCode) : null;

  return (
    <Drawer
      anchor="bottom"
      open={!!teamCode && !!team && !!profile}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '85vh',
          },
        },
      }}
    >
      {team && profile && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Handle bar */}
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
            <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'action.disabled' }} />
          </Box>

          {/* Header */}
          <Box sx={{ px: 3, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {team.flag} {team.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`FIFA #${profile.fifaRanking}`}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: 'rgba(0,61,165,0.12)', color: 'primary.main' }}
                />
                <Chip label={profile.bestResult} size="small" sx={{ fontWeight: 600 }} />
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ mt: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Manager + Description */}
          <Box sx={{ px: 3, mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>Manager:</strong> {profile.manager}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.description}
            </Typography>
          </Box>

          <Divider sx={{ mx: 3 }} />

          {/* Squad */}
          <Box sx={{ px: 3, pt: 2, pb: 3, overflowY: 'auto', flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
              Squad ({profile.squad.length} players)
            </Typography>
            {POS_ORDER.map((pos) => (
              <SquadSection
                key={pos}
                pos={pos}
                players={profile.squad.filter((p) => p.pos === pos)}
              />
            ))}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
