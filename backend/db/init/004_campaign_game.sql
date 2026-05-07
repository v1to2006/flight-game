CREATE TABLE IF NOT EXISTS difficulty_levels (
    id TINYINT UNSIGNED PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS campaign_country_rules (
    iso_country VARCHAR(40) NOT NULL PRIMARY KEY,
    difficulty_id TINYINT UNSIGNED NOT NULL,
    min_airports TINYINT UNSIGNED NOT NULL DEFAULT 2,
    max_airports TINYINT UNSIGNED NOT NULL DEFAULT 5,

    CONSTRAINT fk_campaign_country_rules_country
        FOREIGN KEY (iso_country)
        REFERENCES country(iso_country)
        ON DELETE CASCADE,

    CONSTRAINT fk_campaign_country_rules_difficulty
        FOREIGN KEY (difficulty_id)
        REFERENCES difficulty_levels(id),

    CONSTRAINT chk_country_airport_amount
        CHECK (min_airports <= max_airports)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE IF NOT EXISTS campaign_fixed_airports (
    airport_ident VARCHAR(40) NOT NULL PRIMARY KEY,
    difficulty_id TINYINT UNSIGNED NOT NULL,

    CONSTRAINT fk_campaign_fixed_airports_airport
        FOREIGN KEY (airport_ident)
        REFERENCES airport(ident)
        ON DELETE CASCADE,

    CONSTRAINT fk_campaign_fixed_airports_difficulty
        FOREIGN KEY (difficulty_id)
        REFERENCES difficulty_levels(id)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE IF NOT EXISTS game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    status ENUM('active', 'completed', 'abandoned') NOT NULL DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    CONSTRAINT fk_game_sessions_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS game_occupied_airports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_session_id INT NOT NULL,
    airport_ident VARCHAR(40) NOT NULL,
    difficulty_id TINYINT UNSIGNED NOT NULL,
    liberated BOOLEAN NOT NULL DEFAULT FALSE,
    liberated_at TIMESTAMP NULL,

    CONSTRAINT fk_game_occupied_airports_session
        FOREIGN KEY (game_session_id)
        REFERENCES game_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_game_occupied_airports_airport
        FOREIGN KEY (airport_ident)
        REFERENCES airport(ident)
        ON DELETE CASCADE,

    CONSTRAINT fk_game_occupied_airports_difficulty
        FOREIGN KEY (difficulty_id)
        REFERENCES difficulty_levels(id),

    CONSTRAINT unique_game_airport
        UNIQUE (game_session_id, airport_ident)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;