INSERT INTO difficulty_levels (id, name) VALUES
(1, 'EASY'),
(2, 'MEDIUM'),
(3, 'HARD'),
(4, 'MINIBOSS'),
(5, 'BOSS')
ON DUPLICATE KEY UPDATE
name = VALUES(name);


INSERT INTO campaign_country_rules (
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
('CZ', 3, 2, 3)
ON DUPLICATE KEY UPDATE
difficulty_id = VALUES(difficulty_id),
min_airports = VALUES(min_airports),
max_airports = VALUES(max_airports);


-- Helsinki-Vantaa
INSERT INTO campaign_fixed_airports (airport_ident, difficulty_id) VALUES
('EFHK', 1)
ON DUPLICATE KEY UPDATE
difficulty_id = VALUES(difficulty_id);


-- Wolfsschanze miniboss
INSERT INTO campaign_fixed_airports (airport_ident, difficulty_id) VALUES
('EPKE', 4)
ON DUPLICATE KEY UPDATE
difficulty_id = VALUES(difficulty_id);


-- Berlin Brandenburg final boss
INSERT INTO campaign_fixed_airports (airport_ident, difficulty_id) VALUES
('EDDB', 5)
ON DUPLICATE KEY UPDATE
difficulty_id = VALUES(difficulty_id);


INSERT INTO planes (
    id,
    name,
    default_hp,
    default_speed,
    default_damage,
    default_firerate,
    price
) VALUES
(1, 'Starter Fighter', 100, 50, 10, 0.4, 0),
(2, 'Heavy Fighter', 150, 100, 20, 0.80, 2000),
(3, 'Light Fighter', 80, 150, 30, 1.30, 5000)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
default_hp = VALUES(default_hp),
default_speed = VALUES(default_speed),
default_damage = VALUES(default_damage),
default_firerate = VALUES(default_firerate),
price = VALUES(price);