// Build the item catalog (data/items.js) from the official game dump (ao-data/ao-bin-dumps).
//
//   npm run build:catalog                 -> downloads the latest dump from GitHub
//   node build-catalog.js path/items.json -> uses a local copy of formatted/items.json
//
// Every ID comes from the game files, so no more 404/empty-price items, and the
// English name is the exact in-game name (what you paste into the market search).
const fs = require('fs');
const path = require('path');
const https = require('https');

const DUMP_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json';

// --- Vietnamese labels for common bases (key = ID without tier/enchant) ---
const VN = {
  BAG: 'Túi', BAG_INSIGHT: 'Túi Insight', CAPE: 'Áo Choàng Thường',
  CAPEITEM_FW_BRIDGEWATCH: 'Áo Choàng Bridgewatch', CAPEITEM_FW_FORTSTERLING: 'Áo Choàng Fort Sterling',
  CAPEITEM_FW_LYMHURST: 'Áo Choàng Lymhurst', CAPEITEM_FW_MARTLOCK: 'Áo Choàng Martlock',
  CAPEITEM_FW_THETFORD: 'Áo Choàng Thetford', CAPEITEM_FW_CAERLEON: 'Áo Choàng Caerleon',
  CAPEITEM_FW_BRECILIEN: 'Áo Choàng Brecilien', CAPEITEM_UNDEAD: 'Áo Choàng Undead',
  CAPEITEM_HERETIC: 'Áo Choàng Heretic', CAPEITEM_KEEPER: 'Áo Choàng Keeper',
  CAPEITEM_MORGANA: 'Áo Choàng Morgana', CAPEITEM_DEMON: 'Áo Choàng Demon',

  MOUNT_HORSE: 'Ngựa Cưỡi', MOUNT_ARMORED_HORSE: 'Ngựa Bọc Giáp', MOUNT_OX: 'Bò Tải',
  MOUNT_DIREWOLF: 'Sói Hoang', MOUNT_DIREBEAR: 'Gấu Bạo Chúa', MOUNT_SWAMPDRAGON: 'Rồng Đầm Lầy',
  MOUNT_GIANTSTAG_MOOSE: 'Nai Sừng Tấm', MOUNT_MAMMOTH_TRANSPORT: 'Voi Ma Mút Tải',

  MAIN_SWORD: 'Kiếm 1 Tay', '2H_CLAYMORE': 'Đại Kiếm', '2H_DUALSWORD': 'Song Kiếm',
  MAIN_SCIMITAR_MORGANA: 'Kiếm Clarent', '2H_CLEAVER_HELL': 'Kiếm Đao Carving',
  '2H_DUALSCIMITAR_UNDEAD': 'Song Kiếm Galatine', '2H_CLAYMORE_AVALON': 'Kiếm Kingmaker',
  '2H_BOW': 'Cung Thường', '2H_WARBOW': 'Chiến Cung', '2H_LONGBOW': 'Trường Cung',
  '2H_LONGBOW_UNDEAD': 'Cung Thì Thầm', '2H_BOW_HELL': 'Cung Badon', '2H_BOW_AVALON': 'Cung Mistpiercer',
  MAIN_DAGGER: 'Dao Găm', '2H_DAGGERPAIR': 'Song Dao', '2H_CLAWPAIR': 'Vuốt Sắt',
  MAIN_RAPIER_MORGANA: 'Đoản Kiếm Bloodletter', MAIN_DAGGER_HELL: 'Nanh Quỷ Demonfang',
  '2H_DUALSICKLE_UNDEAD': 'Lưỡi Hái Deathgivers',
  '2H_CROSSBOW': 'Nỏ Thường', MAIN_1HCROSSBOW: 'Nỏ Nhẹ', '2H_CROSSBOWLARGE': 'Trọng Nỏ',
  '2H_REPEATINGCROSSBOW_UNDEAD': 'Nỏ Boltcasters', '2H_CROSSBOWLARGE_MORGANA': 'Nỏ Siegebow',
  MAIN_CURSEDSTAFF: 'Gậy Nguyền 1 Tay', '2H_CURSEDSTAFF': 'Đại Trượng Nguyền',
  '2H_DEMONICSTAFF': 'Trượng Quỷ', MAIN_CURSEDSTAFF_UNDEAD: 'Shadowcaller', '2H_SKULLORB_HELL': 'Sọ Nguyền',
  MAIN_FIRESTAFF: 'Trượng Lửa 1 Tay', '2H_FIRESTAFF': 'Đại Trượng Hỏa', MAIN_FIRESTAFF_KEEPER: 'Wildfire Staff',
  '2H_INFERNOSTAFF': 'Hỏa Ngục', '2H_INFERNOSTAFF_MORGANA': 'Blazing Staff',
  MAIN_FROSTSTAFF: 'Trượng Băng 1 Tay', '2H_FROSTSTAFF': 'Đại Băng Trượng', '2H_ICEGAUNTLETS_HELL': 'Permafrost Prism',
  MAIN_HOLYSTAFF: 'Trượng Thánh 1 Tay', '2H_HOLYSTAFF': 'Đại Trượng Thánh', '2H_DIVINESTAFF': 'Thần Trượng',
  '2H_HOLYSTAFF_HELL': 'Fallen Staff', MAIN_HOLYSTAFF_AVALON: 'Hallowfall',
  MAIN_NATURESTAFF: 'Trượng Tự Nhiên 1 Tay', '2H_WILDSTAFF': 'Trượng Hoang Dã', '2H_NATURESTAFF_KEEPER': 'Blight Staff',
  MAIN_AXE: 'Rìu 1 Tay', '2H_AXE': 'Đại Rìu', '2H_HALBERD': 'Kích', '2H_SCYTHE_HELL': 'Bear Paws',
  '2H_AXE_AVALON': 'Realmbreaker', MAIN_SPEAR: 'Thương 1 Tay', '2H_SPEAR': 'Trường Thương',
  '2H_HARPOON_HELL': 'Spirithunter', '2H_SHAPESHIFTER_MORGANA': 'Prowling Staff',

  ARMOR_CLOTH_SET1: 'Áo Vải Học Giả', ARMOR_CLOTH_SET2: 'Áo Vải Giáo Sĩ', ARMOR_CLOTH_SET3: 'Áo Vải Pháp Sư',
  ARMOR_CLOTH_HELL: 'Áo Vải Cultist', ARMOR_CLOTH_AVALON: 'Robe of Purity',
  HEAD_CLOTH_SET1: 'Mũ Vải Học Giả', HEAD_CLOTH_SET2: 'Mũ Vải Giáo Sĩ', HEAD_CLOTH_SET3: 'Mũ Vải Pháp Sư',
  SHOES_CLOTH_SET1: 'Dép Vải Học Giả', SHOES_CLOTH_SET2: 'Dép Vải Giáo Sĩ',
  ARMOR_LEATHER_SET1: 'Áo Da Lính Đánh Thuê', ARMOR_LEATHER_SET2: 'Áo Da Thợ Săn', ARMOR_LEATHER_SET3: 'Áo Da Sát Thủ',
  ARMOR_LEATHER_MORGANA: 'Áo Da Stalker', ARMOR_LEATHER_HELL: 'Áo Da Hellion', ARMOR_LEATHER_AVALON: 'Áo Da Mistwalker',
  HEAD_LEATHER_SET1: 'Mũ Da Lính Đánh Thuê', HEAD_LEATHER_SET2: 'Mũ Da Thợ Săn', HEAD_LEATHER_SET3: 'Mũ Da Sát Thủ',
  HEAD_LEATHER_MORGANA: 'Mũ Da Stalker', SHOES_LEATHER_SET3: 'Giày Da Sát Thủ',
  ARMOR_PLATE_SET1: 'Giáp Sắt Chiến Binh', ARMOR_PLATE_SET2: 'Giáp Sắt Hiệp Sĩ', ARMOR_PLATE_SET3: 'Giáp Sắt Vệ Binh',
  ARMOR_PLATE_HELL: 'Giáp Demon', ARMOR_PLATE_AVALON: 'Armor of Valor',
  HEAD_PLATE_SET1: 'Mũ Sắt Chiến Binh', HEAD_PLATE_SET2: 'Mũ Sắt Hiệp Sĩ', HEAD_PLATE_SET3: 'Mũ Sắt Vệ Binh',
  SHOES_PLATE_SET1: 'Ủng Sắt Chiến Binh', SHOES_PLATE_SET2: 'Ủng Sắt Hiệp Sĩ',

  MEAL_ROAST: 'Thịt Nướng', MEAL_OMELETTE: 'Trứng Chiên', MEAL_OMELETTE_AVALON: 'Trứng Chiên Avalon',
  MEAL_STEW: 'Thịt Hầm', MEAL_STEW_AVALON: 'Thịt Hầm Avalon', MEAL_STEW_FISH: 'Lươn Hầm', MEAL_SANDWICH: 'Bánh Mì Kẹp',
  POTION_HEAL: 'Bình Máu', POTION_ENERGY: 'Bình Năng Lượng', POTION_COOLDOWN: 'Bình Độc',
  POTION_REVIVE: 'Bình Khổng Lồ', POTION_CLEANSE: 'Bình Tàng Hình',

  PLANKS: 'Ván Gỗ', METALBAR: 'Thỏi Kim Loại', LEATHER: 'Da Thuộc', CLOTH: 'Vải Dệt', STONEBLOCK: 'Khối Đá',
  WOOD: 'Gỗ Thô', ORE: 'Quặng', HIDE: 'Da Sống', FIBER: 'Sợi Thô', ROCK: 'Đá Thô',
  RUNE: 'Rune', SOUL: 'Soul', RELIC: 'Relic', SHARD_AVALONIAN: 'Mảnh Avalon'
};

// Bases in the "🔥 Top Hàng Nóng" preset (high-liquidity, consumed on death).
const HOT_ALL_TIERS = /^(BAG|CAPE|CAPEITEM_.+|MOUNT_(HORSE|ARMORED_HORSE|OX|DIREWOLF|GIANTSTAG_MOOSE)|MEAL_.+|POTION_(HEAL|ENERGY|COOLDOWN|REVIVE|CLEANSE))$/;
const HOT_LOW_TIER_GEAR = new Set(Object.keys(VN).filter(k => /^(MAIN_|2H_|ARMOR_|HEAD_|SHOES_)/.test(k)));

function categorize(base) {
  if (/^(BAG|BAG_INSIGHT|CAPE|CAPEITEM_.+)$/.test(base)) return ['accessories', base.startsWith('BAG') ? 'Bags' : 'Capes'];
  if (/^MOUNT_/.test(base)) return ['mounts', 'Mounts'];
  if (/^(MAIN|2H)_/.test(base)) return ['weapons', 'Weapons'];
  if (/^OFF_/.test(base)) return ['weapons', 'Off-hands'];
  if (/^ARMOR_/.test(base)) return ['armor', 'Armor'];
  if (/^HEAD_/.test(base)) return ['armor', 'Helmets'];
  if (/^SHOES_/.test(base)) return ['armor', 'Shoes'];
  if (/^MEAL_/.test(base)) return ['consumables', 'Food'];
  if (/^POTION_/.test(base)) return ['consumables', 'Potions'];
  if (/^(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)$/.test(base)) return ['materials', 'Refined'];
  if (/^(WOOD|ORE|HIDE|FIBER|ROCK)$/.test(base)) return ['materials', 'Raw'];
  if (/^(RUNE|SOUL|RELIC|SHARD_AVALONIAN)$/.test(base)) return ['materials', 'Enchant Materials'];
  return null;
}

// Black Market only buys equipment (weapons, armor, off-hands, bags, capes).
function bmTradable(category) {
  return category === 'weapons' || category === 'armor' || category === 'accessories';
}

function parseId(id) {
  const m = id.match(/^T(\d)_(.+?)(?:@(\d))?$/);
  if (!m) return null;
  const tier = parseInt(m[1], 10);
  const enchant = m[3] ? parseInt(m[3], 10) : 0;
  const base = m[2].replace(/_LEVEL\d$/, ''); // materials: T5_PLANKS_LEVEL2@2
  return { tier, enchant, base };
}

function build(dump) {
  const items = [];
  for (const entry of dump) {
    const id = entry.UniqueName;
    if (!id || /SKIN|NONTRADABLE|_XMAS|_ADC|TROPHY|TOKEN|QUEST|DEBUG|TUTORIAL/.test(id)) continue;
    const p = parseId(id);
    if (!p) continue;
    const cat = categorize(p.base);
    if (!cat) continue;
    const [category, subcategory] = cat;

    // Keep scan size sane: equipment/materials T4-T8, bags/mounts/consumables from T3.
    const minTier = (category === 'accessories' || category === 'mounts' || category === 'consumables') ? 3 : 4;
    if (p.tier < minTier) continue;

    const enName = (entry.LocalizedNames && entry.LocalizedNames['EN-US']) || id;
    const tierLabel = `T${p.tier}${p.enchant ? '.' + p.enchant : ''}`;
    const vn = VN[p.base];

    const hot = HOT_ALL_TIERS.test(p.base) || (HOT_LOW_TIER_GEAR.has(p.base) && p.tier <= 6);

    items.push({
      id,
      name: vn ? `${vn} ${tierLabel}` : `${enName} ${tierLabel}`,
      enName,
      tier: p.tier,
      enchant: p.enchant,
      category,
      subcategory,
      hot,
      bm: bmTradable(category)
    });
  }
  items.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  return items;
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

async function main() {
  const local = process.argv[2];
  const raw = local ? fs.readFileSync(local, 'utf8') : await download(DUMP_URL);
  const items = build(JSON.parse(raw));
  const counts = items.reduce((a, it) => (a[it.category] = (a[it.category] || 0) + 1, a), {});

  const content = `// Auto-generated by build-catalog.js from ao-data/ao-bin-dumps. Do not edit by hand.
// Generated: ${new Date().toISOString().slice(0, 10)} | Total items: ${items.length}
window.ALBION_ITEMS = ${JSON.stringify(items)};
`;
  fs.writeFileSync(path.join(__dirname, 'data', 'items.js'), content, 'utf8');
  console.log(`Generated ${items.length} items (hot: ${items.filter(i => i.hot).length})`, counts);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { build, parseId };
