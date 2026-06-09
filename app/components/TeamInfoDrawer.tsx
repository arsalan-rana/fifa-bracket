'use client';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import { TEAMS } from '../../data/fifa-2026';
import { getTeamProfile, type Player } from '../../data/team-profiles';

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;
const POS_LABELS: Record<string, string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};
const POS_COLORS: Record<string, string> = {
  GK:  '#F59E0B',
  DEF: '#3B82F6',
  MID: '#10B981',
  FWD: '#EF4444',
};

function SquadRow({ player }: { player: Player }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6 }}>
      <Chip
        label={POS_LABELS[player.pos]}
        size="small"
        sx={{
          height: 18,
          fontSize: '0.6rem',
          fontWeight: 700,
          minWidth: 32,
          bgcolor: `${POS_COLORS[player.pos]}22`,
          color: POS_COLORS[player.pos],
          flexShrink: 0,
        }}
      />
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>
        {player.name}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right', fontSize: '0.72rem', flexShrink: 0 }}>
        {player.club}
      </Typography>
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

  if (!team || !profile) return null;

  const accentColor = team.primaryColor;

  return (
    <Dialog
      open={!!teamCode}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            mx: 2,
          },
        },
      }}
    >
      {/* Colour accent header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${accentColor}dd 0%, ${accentColor}99 100%)`,
          px: 3,
          pt: 3,
          pb: 2.5,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }}>{team.flag}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1, mb: 1.5 }}>
          {team.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`FIFA #${profile.fifaRanking}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.75rem' }}
          />
          <Chip
            label={team.confederation}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}
          />
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Stats row */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ flex: 1, px: 2.5, py: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem', fontWeight: 700 }}>Manager</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{profile.manager}</Typography>
          </Box>
          <Box sx={{ flex: 1, px: 2.5, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <EmojiEventsIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem', fontWeight: 700 }}>Best Result</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{profile.bestResult}</Typography>
          </Box>
        </Box>

        {/* Description */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontStyle: 'italic' }}>
            {profile.description}
          </Typography>
        </Box>

        {/* Squad */}
        <Box sx={{ px: 2.5, pt: 1.5, pb: 2, maxHeight: { xs: '45vh', sm: '50vh' }, overflowY: 'auto' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', display: 'block', mb: 1 }}>
            Squad · {profile.squad.length} players
          </Typography>
          {POS_ORDER.map((pos) => {
            const players = profile.squad.filter((p) => p.pos === pos);
            if (players.length === 0) return null;
            return (
              <Box key={pos} sx={{ mb: 1 }}>
                {players.map((p, i) => (
                  <Box key={p.name}>
                    <SquadRow player={p} />
                    {i < players.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
                  </Box>
                ))}
                {pos !== 'FWD' && <Divider sx={{ mt: 1, mb: 0.5, borderStyle: 'dashed' }} />}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
