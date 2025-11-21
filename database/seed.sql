-- ============================================================
-- seed.sql
-- Stat Tracker sample data
-- 3 Teams, each with 7 players
-- Each team plays the other 2 teams (3 games total)
-- ============================================================


------------------------------------------------------------
-- Insert Teams
------------------------------------------------------------
USE StatTracker;

INSERT INTO Teams (TeamName, TeamColor, Wins, Losses, Ties, PointDifferential)
VALUES
('Wildcats', 'Blue', 1, 1, 0, +5),   -- TeamID = 1
('Panthers', 'Black', 1, 1, 0, -3),  -- TeamID = 2
('Hawks', 'Red', 1, 1, 0, -2);       -- TeamID = 3



------------------------------------------------------------
-- Insert Players (7 per team → 21 total)
------------------------------------------------------------

-- Wildcats (TeamID = 1)
INSERT INTO Players (PlayerName, TeamID) VALUES
('Antonio DesRavines', 1),
('Marcus Green',        1),
('Elijah Carter',       1),
('Jaylen Morris',       1),
('Darius King',         1),
('Noah Turner',         1),
('Isaac Johnson',       1);

-- Panthers (TeamID = 2)
INSERT INTO Players (PlayerName, TeamID) VALUES
('Jordan Lee',          2),
('Brandon Hughes',      2),
('Jason Ward',          2),
('Andre Logan',         2),
('Chris Matthews',      2),
('Kyle Foster',         2),
('Jermaine Cole',       2);

-- Hawks (TeamID = 3)
INSERT INTO Players (PlayerName, TeamID) VALUES
('Samir Patel',         3),
('Aiden Rogers',        3),
('Malik Harris',        3),
('Jonathan Price',      3),
('Caleb Andrews',       3),
('Liam Davis',          3),
('Owen Parker',         3);



------------------------------------------------------------
-- Insert Games (Round-robin: each team plays the other 2)
------------------------------------------------------------

-- Game 1: Wildcats vs Panthers
INSERT INTO Games (GameDate, Season, HomeTeamID, AwayTeamID)
VALUES ('2024-11-01', '2024-2025', 1, 2);   -- GameID = 1

-- Game 2: Panthers vs Hawks
INSERT INTO Games (GameDate, Season, HomeTeamID, AwayTeamID)
VALUES ('2024-11-05', '2024-2025', 2, 3);   -- GameID = 2

-- Game 3: Hawks vs Wildcats
INSERT INTO Games (GameDate, Season, HomeTeamID, AwayTeamID)
VALUES ('2024-11-10', '2024-2025', 3, 1);   -- GameID = 3



------------------------------------------------------------
-- Insert GameStats (sample data for major players)
-- Not every player needs stats for testing; these are examples.
------------------------------------------------------------

-------------------------
-- Game 1: Wildcats vs Panthers (GameID = 1)
-------------------------

-- Wildcats (TeamID = 1, PlayerID 1–7)
INSERT INTO GameStats (PlayerID, GameID, Points, Rebounds, Assists, Steals, Blocks,
                       Turnovers, Fouls, PlusMinus, MinutesPlayed,
                       FGM, FGA, ThreePM, ThreePA, FTM, FTA)
VALUES
(1, 1, 18, 5, 4, 2, 0, 3, 2, +6, 28.5, 7, 12, 2, 5, 2, 2), 
(2, 1, 12, 7, 3, 1, 1, 1, 3, +3, 24.2, 5, 10, 1, 3, 1, 1);

-- Panthers (TeamID = 2, PlayerID 8–14)
INSERT INTO GameStats (PlayerID, GameID, Points, Rebounds, Assists, Steals, Blocks,
                       Turnovers, Fouls, PlusMinus, MinutesPlayed,
                       FGM, FGA, ThreePM, ThreePA, FTM, FTA)
VALUES
(8, 1, 15, 4, 2, 0, 1, 2, 2, -4, 30.1, 6, 14, 1, 4, 2, 2),
(9, 1, 10, 6, 1, 1, 0, 1, 2, -5, 22.7, 4, 9, 1, 3, 1, 1);



-------------------------
-- Game 2: Panthers vs Hawks (GameID = 2)
-------------------------

-- Panthers (TeamID = 2, PlayerID 8–14)
INSERT INTO GameStats (PlayerID, GameID, Points, Rebounds, Assists, Steals, Blocks,
                       Turnovers, Fouls, PlusMinus, MinutesPlayed,
                       FGM, FGA, ThreePM, ThreePA, FTM, FTA)
VALUES
(8, 2, 20, 5, 4, 2, 0, 1, 3, +8, 29.3, 8, 16, 3, 7, 1, 2),
(10, 2, 12, 3, 2, 1, 0, 2, 2, +2, 25.1, 5, 11, 1, 3, 1, 1);

-- Hawks (TeamID = 3, PlayerID 15–21)
INSERT INTO GameStats (PlayerID, GameID, Points, Rebounds, Assists, Steals, Blocks,
                       Turnovers, Fouls, PlusMinus, MinutesPlayed,
                       FGM, FGA, ThreePM, ThreePA, FTM, FTA)
VALUES
(15, 2, 17, 6, 3, 2, 0, 2, 2, -3, 31.0, 7, 15, 2, 6, 1, 2),
(16, 2, 11, 7, 2, 1, 1, 1, 3, -1, 27.9, 5, 12, 0, 3, 1, 1);



-------------------------
-- Game 3: Hawks vs Wildcats (GameID = 3)
-------------------------

-- Hawks (TeamID = 3)
INSERT INTO GameStats (PlayerID, GameID, Points, Rebounds, Assists, Steals, Blocks,
                       Turnovers, Fouls, PlusMinus, MinutesPlayed,
                       FGM, FGA, ThreePM, ThreePA, FTM, FTA)
VALUES
(15, 3, 22, 8, 5, 3, 1, 2, 2, +5, 33.2, 9, 17, 2, 6, 2, 3),
(17, 3, 14, 5, 2, 1, 0, 1, 2, +1, 26.4, 6, 13, 1, 4, 1, 1);

-- Wildcats (TeamID = 1)
INSERT INTO GameStats (PlayerID, GameID, Points, Rebounds, Assists, Steals, Blocks,
                       Turnovers, Fouls, PlusMinus, MinutesPlayed,
                       FGM, FGA, ThreePM, ThreePA, FTM, FTA)
VALUES
(1, 3, 19, 4, 4, 2, 0, 2, 3, -5, 30.7, 7, 14, 3, 5, 2, 2),
(3, 3, 13, 6, 2, 1, 1, 1, 2, -1, 24.8, 5, 11, 1, 4, 2, 2);
