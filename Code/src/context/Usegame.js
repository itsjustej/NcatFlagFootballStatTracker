import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { distanceToFirst, firstDownYard, kickoffYard } from '../gameLogic';

/**
 * Fetches a game, both team rosters, and jersey numbers from the Roster table.
 *
 * Player shape: { id, name, number, team }
 *   number = jersey from Roster for this game, or null if not assigned
 *
 * Also exposes updateJersey(playerId, jersey) which upserts into Roster
 * and updates the local player list immediately (for in-game edits).
 */
export function useGame(gameId) {
  const [game, setGame]               = useState(null);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      setGame(null);
      setHomePlayers([]);
      setAwayPlayers([]);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1. Game + team names
        const { data: gameRow, error: gameErr } = await supabase
          .from('Game')
          .select(`
            game_id,
            opening_possession,
            home_attacks_right,
            home:Team!home_team(team_id, name),
            away:Team!away_team(team_id, name)
          `)
          .eq('game_id', gameId)
          .single();

        if (gameErr) throw gameErr;

        const gameInfo = {
          gameId:     gameRow.game_id,
          homeTeamId: gameRow.home.team_id,
          awayTeamId: gameRow.away.team_id,
          homeName:   gameRow.home.name,
          awayName:   gameRow.away.name,
        };

        // 2. Players for both teams
        const { data: players, error: playerErr } = await supabase
          .from('Player')
          .select('player_id, name, team_id')
          .in('team_id', [gameInfo.homeTeamId, gameInfo.awayTeamId]);

        if (playerErr) throw playerErr;

        // 3. Jersey numbers from Roster for this game
        const playerIds = (players || []).map(p => p.player_id);
        let jerseyMap = {}; // player_id → jersey number

        if (playerIds.length > 0) {
          const { data: rosterRows } = await supabase
            .from('Roster')
            .select('player_id, jersey')
            .eq('game_id', gameId)
            .in('player_id', playerIds);

          for (const row of (rosterRows || [])) {
            jerseyMap[row.player_id] = row.jersey;
          }
        }

        // 4. Map to UI player shape
        const home = [];
        const away = [];
        (players || []).forEach(p => {
          const mapped = {
            id:     String(p.player_id),
            name:   p.name,
            number: jerseyMap[p.player_id] ?? null,
            team:   p.team_id === gameInfo.homeTeamId ? 'home' : 'away',
          };
          if (mapped.team === 'home') home.push(mapped);
          else away.push(mapped);
        });

        const openingPossession = gameRow.opening_possession === 'away' ? 'away' : 'home';
        const homeAttacksRight    = gameRow.home_attacks_right !== false;
        const startYard           = kickoffYard(openingPossession, homeAttacksRight);
        const initialGameState = {
          half:               1,
          clock:              '20:00',
          down:               1,
          distance:           distanceToFirst(startYard, openingPossession, homeAttacksRight),
          yardLine:           startYard,
          possession:         openingPossession,
          openingPossession,
          openingHomeAttacksRight: homeAttacksRight,
          homeAttacksRight,
          homeScore:          0,
          awayScore:          0,
          selectedOffender:   null,
          selectedDefender:   null,
          newSpot:            null,
          playPhase:          'idle',
          playType:           null,
          selectedReceiver:   null,
          penaltyTeam:        null,
          driveId:            1,
          fdTarget:           firstDownYard(startYard, openingPossession, homeAttacksRight),
          log:                [],
          refreshTrigger:     0,
          gameId:             gameInfo.gameId,
          homeTeamId:         gameInfo.homeTeamId,
          awayTeamId:         gameInfo.awayTeamId,
        };

        setHomePlayers(home);
        setAwayPlayers(away);
        setGame({ ...gameInfo, initialGameState });

      } catch (err) {
        console.error('useGame error:', err);
        setError(err.message ?? 'Failed to load game');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [gameId]);

  /**
   * Updates a player's jersey number for this game.
   * Upserts into Roster and updates local state immediately.
   */
  const updateJersey = useCallback(async (playerId, jersey) => {
    if (!gameId) return;

    // Optimistic local update
    const applyUpdate = (list) =>
      list.map(p => p.id === String(playerId) ? { ...p, number: jersey } : p);

    setHomePlayers(prev => applyUpdate(prev));
    setAwayPlayers(prev => applyUpdate(prev));

    // Persist to DB
    await supabase
      .from('Roster')
      .upsert({ game_id: gameId, player_id: playerId, jersey },
               { onConflict: 'game_id,player_id' });
  }, [gameId]);

  return {
    game,
    homePlayers,
    awayPlayers,
    initialGameState: game?.initialGameState ?? null,
    loading,
    error,
    updateJersey,
  };
}