-- ============================================================
-- DATABASE + TABLE CREATION SCRIPT
-- StatTracker Database Schema
-- ============================================================

-- Create database (if it does not exist)
CREATE DATABASE IF NOT EXISTS StatTracker;
USE StatTracker;

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE Teams (
    TeamID INT AUTO_INCREMENT PRIMARY KEY,
    TeamName VARCHAR(100) NOT NULL,
    TeamColor VARCHAR(30),

    Wins INT DEFAULT 0,
    Losses INT DEFAULT 0,
    Ties INT DEFAULT 0,
    PointDifferential INT DEFAULT 0,

    WinPercentage DECIMAL(5,3)
        AS (
            CASE
                WHEN (Wins + Losses + Ties) = 0 THEN 0
                ELSE (Wins + (0.5 * Ties)) / (Wins + Losses + Ties)
            END
        )
        STORED
);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE Players (
    PlayerID INT AUTO_INCREMENT PRIMARY KEY,
    PlayerName VARCHAR(100) NOT NULL,
    TeamID INT NOT NULL,

    FOREIGN KEY (TeamID) REFERENCES Teams(TeamID)
);

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE Games (
    GameID INT AUTO_INCREMENT PRIMARY KEY,
    GameDate DATE NOT NULL,
    Season VARCHAR(20) NOT NULL,

    HomeTeamID INT NOT NULL,
    AwayTeamID INT NOT NULL,

    FOREIGN KEY (HomeTeamID) REFERENCES Teams(TeamID),
    FOREIGN KEY (AwayTeamID) REFERENCES Teams(TeamID)
);

-- ============================================================
-- GAME STATS
-- ============================================================
CREATE TABLE GameStats (
    GameStatsID INT AUTO_INCREMENT PRIMARY KEY,
    PlayerID INT NOT NULL,
    GameID INT NOT NULL,

    Points INT DEFAULT 0,
    Rebounds INT DEFAULT 0,
    Assists INT DEFAULT 0,
    Steals INT DEFAULT 0,
    Blocks INT DEFAULT 0,
    Turnovers INT DEFAULT 0,
    Fouls INT DEFAULT 0,
    PlusMinus INT DEFAULT 0,
    MinutesPlayed DECIMAL(4,1) DEFAULT 0,

    FGM INT DEFAULT 0,
    FGA INT DEFAULT 0,
    ThreePM INT DEFAULT 0,
    ThreePA INT DEFAULT 0,
    FTM INT DEFAULT 0,
    FTA INT DEFAULT 0,

    FOREIGN KEY (PlayerID) REFERENCES Players(PlayerID),
    FOREIGN KEY (GameID) REFERENCES Games(GameID),

    UNIQUE (PlayerID, GameID)
);

-- ============================================================
-- PLAYER SEASON TOTALS
-- ============================================================
CREATE TABLE PlayerSeasonStats (
    PlayerSeasonStatsID INT AUTO_INCREMENT PRIMARY KEY,
    PlayerID INT NOT NULL,
    Season VARCHAR(20) NOT NULL,

    GamesPlayed INT DEFAULT 0,

    TotalPoints INT DEFAULT 0,
    AvgPoints DECIMAL(6,2) DEFAULT 0,

    TotalRebounds INT DEFAULT 0,
    AvgRebounds DECIMAL(6,2) DEFAULT 0,

    TotalAssists INT DEFAULT 0,
    AvgAssists DECIMAL(6,2) DEFAULT 0,

    TotalSteals INT DEFAULT 0,
    AvgSteals DECIMAL(6,2) DEFAULT 0,

    TotalBlocks INT DEFAULT 0,
    AvgBlocks DECIMAL(6,2) DEFAULT 0,

    TotalTurnovers INT DEFAULT 0,
    AvgTurnovers DECIMAL(6,2) DEFAULT 0,

    TotalFouls INT DEFAULT 0,
    AvgFouls DECIMAL(6,2) DEFAULT 0,

    TotalPlusMinus INT DEFAULT 0,
    AvgPlusMinus DECIMAL(6,2) DEFAULT 0,

    TotalFGM INT DEFAULT 0,
    TotalFGA INT DEFAULT 0,
    FGPercentage DECIMAL(6,3) DEFAULT 0,

    Total3PM INT DEFAULT 0,
    Total3PA INT DEFAULT 0,
    ThreePointPercentage DECIMAL(6,3) DEFAULT 0,

    TotalFTM INT DEFAULT 0,
    TotalFTA INT DEFAULT 0,
    FTPercentage DECIMAL(6,3) DEFAULT 0,

    FOREIGN KEY (PlayerID) REFERENCES Players(PlayerID),
    UNIQUE (PlayerID, Season)
);

-- ============================================================
-- TEAM SEASON TOTALS
-- ============================================================
CREATE TABLE TeamSeasonStats (
    TeamSeasonStatsID INT AUTO_INCREMENT PRIMARY KEY,
    TeamID INT NOT NULL,
    Season VARCHAR(20) NOT NULL,

    GamesPlayed INT DEFAULT 0,

    TotalPoints INT DEFAULT 0,
    AvgPoints DECIMAL(6,2) DEFAULT 0,

    TotalRebounds INT DEFAULT 0,
    AvgRebounds DECIMAL(6,2) DEFAULT 0,

    TotalAssists INT DEFAULT 0,
    AvgAssists DECIMAL(6,2) DEFAULT 0,

    TotalTurnovers INT DEFAULT 0,
    AvgTurnovers DECIMAL(6,2) DEFAULT 0,

    TotalFouls INT DEFAULT 0,
    AvgFouls DECIMAL(6,2) DEFAULT 0,

    TotalPointsAllowed INT DEFAULT 0,
    AvgPointsAllowed DECIMAL(6,2) DEFAULT 0,

    PointDifferential INT DEFAULT 0,

    FOREIGN KEY (TeamID) REFERENCES Teams(TeamID),
    UNIQUE (TeamID, Season)
);
