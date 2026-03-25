insert into public.knowledge_components (id, name, description)
values
	('scoring_categories', 'Scoring Categories', 'Identify all end-game scoring categories: stars, territories, resources, and coins.'),
	('popularity_multiplier', 'Popularity Multiplier', 'Apply the correct multiplier based on popularity tier.'),
	('component_computation', 'Component Computation', 'Compute each scoring component correctly from board state values.'),
	('total_computation', 'Total Computation', 'Sum all components to produce the correct final score.'),
	('error_reflection', 'Error Reflection', 'Recognize likely mistakes and revise calculations intentionally.')
on conflict (id) do update
set
	name = excluded.name,
	description = excluded.description;

insert into public.scoring_scenarios (
	title,
	description,
	difficulty,
	stars,
	territories,
	resources,
	coins,
	popularity,
	tags
)
values
	('Starter 1: Low Popularity Basics', 'Foundational scenario emphasizing category identification and low-tier multipliers.', 1, 3, 5, 6, 8, 4, array['starter', 'low-tier']),
	('Starter 2: Mid Popularity Basics', 'Practice moving from low to mid popularity multiplier.', 1, 2, 6, 7, 12, 8, array['starter', 'mid-tier']),
	('Starter 3: High Popularity Basics', 'Simple high-tier scenario to reinforce multiplier awareness.', 1, 4, 4, 5, 10, 14, array['starter', 'high-tier']),
	('Core 1: Resource Pair Focus', 'Resource-heavy board state to practice resource pair counting.', 2, 3, 6, 11, 9, 9, array['core', 'resource-pairs']),
	('Core 2: Territory Focus', 'Territory-heavy board state with moderate resources.', 2, 2, 9, 4, 7, 10, array['core', 'territories']),
	('Core 3: Star Focus', 'Star-heavy board state with balanced remaining categories.', 2, 6, 4, 8, 6, 11, array['core', 'stars']),
	('Core 4: Coin Heavy', 'Coin-heavy scenario where arithmetic mistakes are common.', 2, 2, 5, 6, 25, 12, array['core', 'coins']),
	('Challenge 1: Mixed High Volume', 'Large values across categories for multi-step attention checks.', 3, 5, 10, 14, 18, 13, array['challenge', 'mixed']),
	('Challenge 2: Mid Tier Trap', 'Values chosen to trigger common multiplier misconceptions.', 3, 4, 8, 10, 15, 7, array['challenge', 'multiplier-trap']),
	('Challenge 3: Arithmetic Trap', 'Balanced components with totals that invite summation errors.', 3, 3, 7, 12, 19, 9, array['challenge', 'arithmetic'])
on conflict do nothing;
