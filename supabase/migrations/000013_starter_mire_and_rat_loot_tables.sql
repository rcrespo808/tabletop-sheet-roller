-- Starter loot tables for mire relics and the Reverend of Rats hideout.

alter table public.game_tables
  alter column owner_user_id drop not null;

insert into public.game_tables (id, owner_user_id, name, slug)
values (
  '00000000-0000-4000-8000-000000000013',
  null,
  'Starter Loot Tables',
  'starter-loot-tables'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  updated_at = now();

insert into public.loot_tables (
  id,
  campaign_id,
  name,
  description,
  visibility,
  entries,
  created_by
)
values
(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000013',
  'Mire Relics and Sinkholes',
  'A D&D-leaning mire loot table for swamp ruins, cult caches, hag refuse, drowned graves, and Blood Weave-tainted relics.',
  'gm_only',
  $json$[
    {"id":"entry-mire-01","label":"Blackreed Coin Pouch","weight":10,"rarity":"common","reward":{"type":"currency","walletDelta":{"gp":18,"sp":7}},"notes":"Mud-stained coins wrapped in waxed reedcloth."},
    {"id":"entry-mire-02","label":"Bog-Iron Scraps","weight":10,"rarity":"common","reward":{"type":"item","item":{"id":"item-bog-iron-scraps","name":"Bog-Iron Scraps","quantity":3,"rarity":"common","notes":"Useful for repairs, crude weapons, or ritual anchors.","metadata":{"tags":["crafting","mire"]}}},"notes":""},
    {"id":"entry-mire-03","label":"Bundle of Witch-Reed Incense","weight":9,"rarity":"common","reward":{"type":"item","item":{"id":"item-witch-reed-incense","name":"Witch-Reed Incense","quantity":1,"rarity":"common","notes":"Burning it masks scent and gives a foul ceremonial haze.","metadata":{"tags":["consumable","ritual"]}}},"notes":""},
    {"id":"entry-mire-04","label":"Mireglass Shard","weight":9,"rarity":"common","reward":{"type":"item","item":{"id":"item-mireglass-shard","name":"Mireglass Shard","quantity":1,"rarity":"common","notes":"A green-black glass splinter. Shows faint movement in nearby water.","metadata":{"tags":["clue","occult"]}}},"notes":""},
    {"id":"entry-mire-05","label":"Rotblossom Poultice","weight":8,"rarity":"common","reward":{"type":"item","item":{"id":"item-rotblossom-poultice","name":"Rotblossom Poultice","quantity":1,"rarity":"common","notes":"A swamp medicine. Grants advantage on one check to treat poison or disease, at GM discretion.","metadata":{"tags":["consumable","medicine"]}}},"notes":""},
    {"id":"entry-mire-06","label":"Cultist Bone Token","weight":8,"rarity":"common","reward":{"type":"note","title":"Cultist Bone Token","body":"A carved charm of Armok. It may grant a social opening with mire cultists or mark the bearer as suspicious elsewhere."},"notes":""},
    {"id":"entry-mire-07","label":"Waterlogged Map Fragment","weight":8,"rarity":"common","reward":{"type":"note","title":"Waterlogged Map Fragment","body":"Shows a partial route through sinkholes and old grave-roads. Useful as a clue handout."},"notes":""},
    {"id":"entry-mire-08","label":"Swamp Pearls","weight":7,"rarity":"common","reward":{"type":"currency","walletDelta":{"gp":25}},"notes":"Small black pearls taken from diseased mollusks."},
    {"id":"entry-mire-09","label":"Leech Jar","weight":7,"rarity":"common","reward":{"type":"item","item":{"id":"item-leech-jar","name":"Leech Jar","quantity":1,"rarity":"common","notes":"Can be used for grim medicine, intimidation, or a disgusting distraction.","metadata":{"tags":["tool","mire"]}}},"notes":""},
    {"id":"entry-mire-10","label":"Smiling One Tooth","weight":6,"rarity":"common","reward":{"type":"item","item":{"id":"item-smiling-one-tooth","name":"Smiling One Tooth","quantity":1,"rarity":"common","notes":"A disturbing token. Whispers when soaked in blood.","metadata":{"tags":["horror","clue"]}}},"notes":""},
    {"id":"entry-mire-11","label":"Grave-Moss Candle","weight":6,"rarity":"common","reward":{"type":"item","item":{"id":"item-grave-moss-candle","name":"Grave-Moss Candle","quantity":1,"rarity":"common","notes":"When lit, undead footprints within 30 feet faintly glow for one minute.","metadata":{"tags":["consumable","tracking"]}}},"notes":""},
    {"id":"entry-mire-12","label":"Froghemoth Slime Flask","weight":5,"rarity":"common","reward":{"type":"item","item":{"id":"item-froghemoth-slime-flask","name":"Froghemoth Slime Flask","quantity":1,"rarity":"common","notes":"Thrown flask creates a small slick patch. GM adjudicates save/terrain effect.","metadata":{"tags":["consumable","hazard"]}}},"notes":""},
    {"id":"entry-mire-13","label":"Mirelord Prayer Strip","weight":5,"rarity":"common","reward":{"type":"note","title":"Mirelord Prayer Strip","body":"A strip of bark bearing a prayer to death and renewal. Can point toward Mirelord lore or cult negotiation."},"notes":""},
    {"id":"entry-mire-14","label":"Ring of Marsh-Breath","weight":3,"rarity":"uncommon","reward":{"type":"item","item":{"id":"item-ring-marsh-breath","name":"Ring of Marsh-Breath","quantity":1,"rarity":"uncommon","notes":"While worn, the bearer can hold breath twice as long and has advantage on checks against swamp fumes.","metadata":{"tags":["magic","survival"]}}},"notes":""},
    {"id":"entry-mire-15","label":"Quiver of Phasebolts","weight":3,"rarity":"uncommon","reward":{"type":"item","item":{"id":"item-quiver-phasebolts","name":"Quiver of Phasebolts","quantity":1,"rarity":"uncommon","notes":"Contains 3 spectral bolts that ignore half cover and briefly flicker through wood or reeds.","metadata":{"tags":["magic","ammunition"]}}},"notes":""},
    {"id":"entry-mire-16","label":"Veinsteel Scimitar of Regret","weight":2,"rarity":"uncommon","reward":{"type":"item","item":{"id":"item-veinsteel-scimitar-regret","name":"Veinsteel Scimitar of Regret","quantity":1,"rarity":"uncommon","notes":"+1 scimitar. Once per long rest, after hitting, force target to make a Wisdom save or be unable to take reactions until its next turn.","metadata":{"tags":["magic","weapon"]}}},"notes":""},
    {"id":"entry-mire-17","label":"Amulet of the Mirelord","weight":1,"rarity":"rare","reward":{"type":"item","item":{"id":"item-amulet-mirelord","name":"Amulet of the Mirelord","quantity":1,"rarity":"rare","notes":"Grants resistance to poison/necrotic themes at GM discretion and carries a creeping corruption hook.","metadata":{"tags":["magic","relic","mirelord"]}}},"notes":""},
    {"id":"entry-mire-18","label":"Dreambound Grimoire","weight":1,"rarity":"rare","reward":{"type":"item","item":{"id":"item-dreambound-grimoire","name":"Dreambound Grimoire","quantity":1,"rarity":"rare","notes":"A spellbook that can answer one question during a long rest through a nightmare vision, but demands a memory in return.","metadata":{"tags":["magic","book","curse"]}}},"notes":""},
    {"id":"entry-mire-19","label":"Shield of the Sinking Grave","weight":1,"rarity":"rare","reward":{"type":"item","item":{"id":"item-shield-sinking-grave","name":"Shield of the Sinking Grave","quantity":1,"rarity":"rare","notes":"+1 shield. Once per long rest, create 15 feet of difficult terrain as grasping marsh-hands rise.","metadata":{"tags":["magic","shield","undead"]}}},"notes":""},
    {"id":"entry-mire-20","label":"Heart-Silt Relic","weight":1,"rarity":"unique","reward":{"type":"condition","condition":{"id":"condition-heart-silt-marked","name":"Marked by Heart-Silt","description":"The Mire notices the bearer. Once before the next dawn, the GM may offer advantage on a death, decay, swamp, or renewal-related roll at a narrative cost.","source":"Mire Loot Table"}},"notes":"Capstone result added because 13 common + 3 uncommon + 3 rare = 19."}
  ]$json$::jsonb,
  null
),
(
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000013',
  'Reverend of Rats Hideout',
  'An NWoD-leaning loot table for an abandoned church hideout full of disease, intelligence fragments, infiltration tools, and vermin miracles.',
  'gm_only',
  $json$[
    {"id":"entry-rat-01","label":"Jar of Chapel Keys","weight":10,"rarity":"common","reward":{"type":"item","item":{"id":"item-jar-chapel-keys","name":"Jar of Chapel Keys","quantity":1,"rarity":"common","notes":"A jangling jar of mismatched keys from abandoned churches, basements, and municipal locks.","metadata":{"tags":["tool","infiltration"]}}},"notes":""},
    {"id":"entry-rat-02","label":"Moldy Confession Ledger","weight":10,"rarity":"common","reward":{"type":"note","title":"Moldy Confession Ledger","body":"Contains names, sins, debts, and blackmail seeds from the neighborhood around the Rat Chapel."},"notes":""},
    {"id":"entry-rat-03","label":"Rat-Scented Cassock","weight":9,"rarity":"common","reward":{"type":"item","item":{"id":"item-rat-scented-cassock","name":"Rat-Scented Cassock","quantity":1,"rarity":"common","notes":"+1 circumstance bonus to blend with derelict clergy, squatters, or vermin cult imagery when plausible.","metadata":{"tags":["disguise","social"]}}},"notes":""},
    {"id":"entry-rat-04","label":"Packet of Spoiled Incense","weight":9,"rarity":"common","reward":{"type":"item","item":{"id":"item-spoiled-incense","name":"Packet of Spoiled Incense","quantity":1,"rarity":"common","notes":"Can mask human scent or make a room seem abandoned, sick, or ritually fouled.","metadata":{"tags":["consumable","stealth"]}}},"notes":""},
    {"id":"entry-rat-05","label":"Chewed Police Report","weight":8,"rarity":"common","reward":{"type":"note","title":"Chewed Police Report","body":"A partial mundane investigation report. One clue survived the teeth."},"notes":""},
    {"id":"entry-rat-06","label":"Loose Cash in Offering Box","weight":8,"rarity":"common","reward":{"type":"currency","walletDelta":{"cash":40}},"notes":"NWoD-style cash/resources note. Store as custom currency."},
    {"id":"entry-rat-07","label":"Nest of Burner Phones","weight":8,"rarity":"common","reward":{"type":"item","item":{"id":"item-burner-phone-nest","name":"Nest of Burner Phones","quantity":3,"rarity":"common","notes":"Mostly functional cheap phones, each with one useful contact or message thread.","metadata":{"tags":["intel","equipment"]}}},"notes":""},
    {"id":"entry-rat-08","label":"Stained Medical Kit","weight":7,"rarity":"common","reward":{"type":"item","item":{"id":"item-stained-medical-kit","name":"Stained Medical Kit","quantity":1,"rarity":"common","notes":"Old but usable medical supplies. Good for one field treatment scene before needing restock.","metadata":{"tags":["medicine","tool"]}}},"notes":""},
    {"id":"entry-rat-09","label":"Vermin Trail Map","weight":7,"rarity":"common","reward":{"type":"note","title":"Vermin Trail Map","body":"A hand-drawn route of drainpipes, wall gaps, and abandoned service tunnels near the hideout."},"notes":""},
    {"id":"entry-rat-10","label":"Blackmail Photograph","weight":6,"rarity":"common","reward":{"type":"note","title":"Blackmail Photograph","body":"A compromising photo of a minor official entering the chapel after midnight."},"notes":""},
    {"id":"entry-rat-11","label":"Powdered Rat-Bone Chalk","weight":6,"rarity":"common","reward":{"type":"item","item":{"id":"item-rat-bone-chalk","name":"Powdered Rat-Bone Chalk","quantity":1,"rarity":"common","notes":"Used to mark invisible vermin paths or ward a threshold against mundane pests.","metadata":{"tags":["occult","tool"]}}},"notes":""},
    {"id":"entry-rat-12","label":"Rotten Communion Wine","weight":5,"rarity":"common","reward":{"type":"condition","condition":{"id":"condition-nauseated-by-rotwine","name":"Nauseated by Rotwine","description":"A minor Sickened-style condition after drinking or weaponizing the spoiled sacrament. Resolve through rest or treatment.","source":"Reverend Hideout Loot"}},"notes":""},
    {"id":"entry-rat-13","label":"Whispering Wall Scrap","weight":5,"rarity":"common","reward":{"type":"note","title":"Whispering Wall Scrap","body":"A torn piece of wallpaper covered in tiny bite marks forming half a name."},"notes":""},
    {"id":"entry-rat-14","label":"Saint of Vermin Icon","weight":3,"rarity":"uncommon","reward":{"type":"item","item":{"id":"item-saint-vermin-icon","name":"Saint of Vermin Icon","quantity":1,"rarity":"uncommon","notes":"Once per session, may justify a +2 bonus to command, interpret, or bargain with rats or vermin spirits.","metadata":{"tags":["occult","relic","vermin"]}}},"notes":""},
    {"id":"entry-rat-15","label":"Parallel Thought Rosary","weight":3,"rarity":"uncommon","reward":{"type":"item","item":{"id":"item-parallel-thought-rosary","name":"Parallel Thought Rosary","quantity":1,"rarity":"uncommon","notes":"A crude focus for swarm-mind meditation. Grants +1 to one extended Investigation/Occult roll involving many simultaneous clues.","metadata":{"tags":["mind","occult","tool"]}}},"notes":""},
    {"id":"entry-rat-16","label":"Plague Vector Notes","weight":2,"rarity":"uncommon","reward":{"type":"codex","codexEntryId":"vesper-plague"},"notes":"Links to the custom Vesper Plague codex entry if present."},
    {"id":"entry-rat-17","label":"Reliquary of the Many Teeth","weight":1,"rarity":"rare","reward":{"type":"item","item":{"id":"item-reliquary-many-teeth","name":"Reliquary of the Many Teeth","quantity":1,"rarity":"rare","notes":"A grisly relic. Once per story, convert a failed Investigation or Stealth roll involving rats into a dramatic clue at a cost chosen by the GM.","metadata":{"tags":["relic","vermin","story"]}}},"notes":""},
    {"id":"entry-rat-18","label":"Doctrine of the Swarm-Mind","weight":1,"rarity":"rare","reward":{"type":"codex","codexEntryId":"many-eyed-sermon"},"notes":"Links to Many-Eyed Sermon if present."},
    {"id":"entry-rat-19","label":"The Reverend's True Name","weight":1,"rarity":"rare","reward":{"type":"note","title":"The Reverend's True Name","body":"A dangerous secret. Knowing it grants leverage, ritual access, or a direct line into the Reverend's fractured swarm identity."},"notes":""},
    {"id":"entry-rat-20","label":"Blessing of the Rat Chapel","weight":1,"rarity":"unique","reward":{"type":"condition","condition":{"id":"condition-blessing-rat-chapel","name":"Blessing of the Rat Chapel","description":"For one session, gain a supernatural edge when moving through filth, crowds, ruins, tunnels, or vermin-infested spaces. The GM may also introduce vermin attention as a complication.","source":"Reverend Hideout Loot"}},"notes":"Capstone result added because 13 common + 3 uncommon + 3 rare = 19."}
  ]$json$::jsonb,
  null
)
on conflict (id) do update
set
  campaign_id = excluded.campaign_id,
  name = excluded.name,
  description = excluded.description,
  visibility = excluded.visibility,
  entries = excluded.entries,
  updated_at = now();
