import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { distanceToFirst, firstDownYard, kickoffYard } from '../gameLogic';
import { cleanPlayerName, isUnknownPlayer } from '../utils/playerName';
import { ensureUnknownPlayers, withUnknownLast } from '../utils/unknownPlayer';

/**
 * Numbered players run left to right by jersey. Players still waiting on a
 * number stay on the right, ordered by name.
 */
export function sortByJersey(players) {
  return [...players].sort((a, b) => {
    const aHas = a.number != null && !Number.isNaN(Number(a.number));
    const bHas = b.number != null && !Number.isNaN(Number(b.number));
    if (aHas && bHas) {
      const diff = Number(a.number) - Number(b.number);
      if (diff !== 0) return diff;
    } else if (aHas !== bHas) {
      return aHas ? -1 : 1;
    }
    return String(a.name).localeCompare(String(b.name));
  });
}

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
        const [gameResult, rosterResult] = await Promise.all([
          supabase
            .from('Game')
            .select(`
              game_id,
              opening_possession,
              home_attacks_right,
              has_forty_yard,
              home:Team!home_team(team_id, name, Player(player_id, name, team_id)),
              away:Team!away_team(team_id, name, Player(player_id, name, team_id))
            `)
            .eq('game_id', gameId)
            .single(),
          supabase.from('Roster').select('player_id, jersey').eq('game_id', gameId),
        ]);
        const { data: gameRow, error: gameErr } = gameResult;
        if (gameErr) throw gameErr;

        const gameInfo = {
          gameId:     gameRow.game_id,
          homeTeamId: gameRow.home.team_id,
          awayTeamId: gameRow.away.team_id,
          homeName:   gameRow.home.name,
          awayName:   gameRow.away.name,
        };

        const rosterPlayers = [
          ...(gameRow.home.Player || []),
          ...(gameRow.away.Player || []),
        ];
        const unknownByTeam = await ensureUnknownPlayers(
          [gameInfo.homeTeamId, gameInfo.awayTeamId],
          rosterPlayers,
        );
        for (const unknown of unknownByTeam.values()) {
          if (rosterPlayers.some((p) => p.player_id === unknown.player_id)) continue;
          rosterPlayers.push(unknown);
        }

        const jerseyMap = {};
        for (const row of (rosterResult.data || [])) {
          jerseyMap[row.player_id] = row.jersey;
        }

        // 4. Map to UI player shape
        const home = [];
        const away = [];
        rosterPlayers.forEach(p => {
          const mapped = {
            id:     String(p.player_id),
            name:   cleanPlayerName(p.name),
            number: jerseyMap[p.player_id] ?? null,
            team:   p.team_id === gameInfo.homeTeamId ? 'home' : 'away',
          };
          if (mapped.team === 'home') home.push(mapped);
          else away.push(mapped);
        });

        const openingPossession = gameRow.opening_possession === 'away' ? 'away' : 'home';
        const homeAttacksRight    = gameRow.home_attacks_right !== false;
        const hasFortyYard        = gameRow.has_forty_yard !== false;
        const startYard           = kickoffYard(openingPossession, homeAttacksRight, hasFortyYard);
        const initialGameState = {
          half:               1,
          down:               1,
          distance:           distanceToFirst(startYard, openingPossession, homeAttacksRight, hasFortyYard),
          yardLine:           startYard,
          possession:         openingPossession,
          openingPossession,
          openingHomeAttacksRight: homeAttacksRight,
          homeAttacksRight,
          hasFortyYard,
          homeScore:          0,
          awayScore:          0,
          selectedOffender:   null,
          selectedDefender:   null,
          newSpot:            null,
          playPhase:          'idle',
          playType:           null,
          selectedReceiver:   null,
          lastPasser:         { home: null, away: null },
          penaltyTeam:        null,
          driveId:            1,
          fdTarget:           firstDownYard(startYard, openingPossession, homeAttacksRight, hasFortyYard),
          log:                [],
          refreshTrigger:     0,
          gameId:             gameInfo.gameId,
          homeTeamId:         gameInfo.homeTeamId,
          awayTeamId:         gameInfo.awayTeamId,
        };

        setHomePlayers(withUnknownLast(sortByJersey(home)));
        setAwayPlayers(withUnknownLast(sortByJersey(away)));
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
      withUnknownLast(sortByJersey(list.map(p => p.id === String(playerId) ? { ...p, number: jersey } : p)));

    setHomePlayers(prev => applyUpdate(prev));
    setAwayPlayers(prev => applyUpdate(prev));

    // Persist to DB
    await supabase
      .from('Roster')
      .upsert({ game_id: gameId, player_id: playerId, jersey },
               { onConflict: 'game_id,player_id' });
  }, [gameId]);

  const addPlayer = useCallback(async (side, rawName) => {
    if (!gameId || !game) throw new Error('No game is open.');
    const name = cleanPlayerName(rawName);
    if (!name || isUnknownPlayer(name)) throw new Error('Enter a player name.');

    const teamId = side === 'away' ? game.awayTeamId : game.homeTeamId;
    const existing = side === 'away' ? awayPlayers : homePlayers;
    if (existing.some((player) => cleanPlayerName(player.name).toLowerCase() === name.toLowerCase())) {
      throw new Error('That player is already on this team.');
    }

    const { data, error: insertError } = await supabase
      .from('Player')
      .insert([{ name, team_id: teamId }])
      .select('player_id, name')
      .single();
    if (insertError) throw new Error(insertError.message || 'Could not add that player.');

    const mapped = {
      id: String(data.player_id),
      name: cleanPlayerName(data.name),
      number: null,
      team: side === 'away' ? 'away' : 'home',
    };
    const add = (list) => withUnknownLast(sortByJersey(
      list.some((player) => player.id === mapped.id) ? list : [...list, mapped],
    ));
    if (mapped.team === 'away') setAwayPlayers(add);
    else setHomePlayers(add);
    return mapped.id;
  }, [gameId, game, homePlayers, awayPlayers]);

  return {
    game,
    homePlayers,
    awayPlayers,
    initialGameState: game?.initialGameState ?? null,
    loading,
    error,
    updateJersey,
    addPlayer,
  };
}