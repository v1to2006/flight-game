INSERT IGNORE INTO difficulty_levels (id, name) VALUES
(1, 'EASY'),
(2, 'MEDIUM'),
(3, 'HARD'),
(4, 'BOSS');


INSERT IGNORE INTO campaign_country_rules (
    iso_country,
    difficulty_id,
    min_airports,
    max_airports
) VALUES
('FI', 1, 2, 3),
('SE', 1, 2, 3),
('NO', 1, 2, 3),

('DK', 2, 2, 3),
('EE', 2, 2, 3),
('LV', 2, 2, 3),
('LT', 2, 2, 3),

('DE', 3, 2, 3),
('PL', 3, 2, 3),
('CZ', 3, 2, 3);


-- Helsinki-Vantaa
INSERT IGNORE INTO campaign_fixed_airports (airport_ident, difficulty_id) VALUES
('EFHK', 1);

-- Berlin Brandenburg
INSERT IGNORE INTO campaign_fixed_airports (airport_ident, difficulty_id) VALUES
('EDDB', 4);


INSERT IGNORE INTO planes (
    id,
    name,
    default_hp,
    default_speed,
    default_damage,
    default_firerate,
    price
) VALUES
(1, 'Starter Fighter', 100, 250, 20, 1.00, 0),
(2, 'Heavy Fighter', 150, 210, 35, 0.80, 500),
(3, 'Light Fighter', 80, 320, 16, 1.30, 700);