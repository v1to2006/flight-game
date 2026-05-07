CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    current_player_plane_id INT NULL,
    money INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_players_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS planes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    default_hp INT UNSIGNED NOT NULL,
    default_speed INT UNSIGNED NOT NULL,
    default_damage INT UNSIGNED NOT NULL,
    default_firerate DECIMAL(6,2) NOT NULL,
    price INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS player_planes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    plane_id INT NOT NULL,

    hp_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
    speed_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
    damage_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
    firerate_level TINYINT UNSIGNED NOT NULL DEFAULT 0,

    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_player_planes_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_player_planes_plane
        FOREIGN KEY (plane_id)
        REFERENCES planes(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_player_plane
        UNIQUE (player_id, plane_id),

    CONSTRAINT chk_hp_level CHECK (hp_level BETWEEN 0 AND 5),
    CONSTRAINT chk_speed_level CHECK (speed_level BETWEEN 0 AND 5),
    CONSTRAINT chk_damage_level CHECK (damage_level BETWEEN 0 AND 5),
    CONSTRAINT chk_firerate_level CHECK (firerate_level BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE players
ADD CONSTRAINT fk_players_current_player_plane
    FOREIGN KEY (current_player_plane_id)
    REFERENCES player_planes(id)
    ON DELETE SET NULL;