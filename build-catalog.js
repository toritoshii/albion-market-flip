// Script to generate high-quality curated item catalog for Albion Market Flipping
const fs = require('fs');
const path = require('path');

const TIERS = [4, 5, 6, 7, 8];
const ENCHANTS = [0, 1, 2, 3];

// Helper to generate enchant suffix
function getEnchantSuffix(enc) {
  return enc === 0 ? '' : `@${enc}`;
}

const items = [];

// 1. Bags
for (let t of [3, 4, 5, 6, 7, 8]) {
  for (let enc of (t >= 4 ? [0, 1, 2] : [0])) {
    const encStr = getEnchantSuffix(enc);
    items.push({
      id: `T${t}_BAG${encStr}`,
      name: `Túi T${t} Bag${enc > 0 ? ' .' + enc : ''}`,
      enName: `T${t} Bag${enc > 0 ? ' .' + enc : ''}`,
      tier: t,
      enchant: enc,
      category: 'accessories',
      subcategory: 'Bags'
    });
  }
}

// 2. Regular Capes
for (let t of [4, 5, 6, 7, 8]) {
  for (let enc of [0, 1, 2]) {
    const encStr = getEnchantSuffix(enc);
    items.push({
      id: `T${t}_CAPE${encStr}`,
      name: `Áo Choàng Thường T${t} Cape${enc > 0 ? ' .' + enc : ''}`,
      enName: `T${t} Cape${enc > 0 ? ' .' + enc : ''}`,
      tier: t,
      enchant: enc,
      category: 'accessories',
      subcategory: 'Capes'
    });
  }
}

// 3. Faction & Special Capes
const FACTION_CAPES = [
  { code: 'FW_BRIDGEWATCH', name: 'Bridgewatch' },
  { code: 'FW_FORTSTERLING', name: 'Fort Sterling' },
  { code: 'FW_LYMHURST', name: 'Lymhurst' },
  { code: 'FW_MARTLOCK', name: 'Martlock' },
  { code: 'FW_THETFORD', name: 'Thetford' },
  { code: 'FW_CAERLEON', name: 'Caerleon' },
  { code: 'FW_BRECILIEN', name: 'Brecilien' },
  { code: 'UNDEAD', name: 'Undead' },
  { code: 'HERETIC', name: 'Heretic' },
  { code: 'KEEPER', name: 'Keeper' },
  { code: 'MORGANA', name: 'Morgana' },
  { code: 'DEMON', name: 'Demon' }
];

for (let fc of FACTION_CAPES) {
  for (let t of [4, 5, 6, 7, 8]) {
    for (let enc of [0, 1, 2, 3]) {
      const encStr = getEnchantSuffix(enc);
      items.push({
        id: `T${t}_CAPEITEM_${fc.code}${encStr}`,
        name: `Áo Choàng ${fc.name} T${t}${enc > 0 ? ' .' + enc : ''}`,
        enName: `T${t} ${fc.name} Cape${enc > 0 ? ' .' + enc : ''}`,
        tier: t,
        enchant: enc,
        category: 'accessories',
        subcategory: 'Faction Capes'
      });
    }
  }
}

// 4. Mounts
const MOUNT_LIST = [
  { id: 'T3_MOUNT_HORSE', name: 'Ngựa Cưỡi T3 Riding Horse', en: 'T3 Riding Horse', tier: 3 },
  { id: 'T4_MOUNT_HORSE', name: 'Ngựa Cưỡi T4 Riding Horse', en: 'T4 Riding Horse', tier: 4 },
  { id: 'T5_MOUNT_HORSE', name: 'Ngựa Cưỡi T5 Riding Horse', en: 'T5 Riding Horse', tier: 5 },
  { id: 'T6_MOUNT_HORSE', name: 'Ngựa Cưỡi T6 Riding Horse', en: 'T6 Riding Horse', tier: 6 },
  { id: 'T7_MOUNT_HORSE', name: 'Ngựa Cưỡi T7 Riding Horse', en: 'T7 Riding Horse', tier: 7 },
  { id: 'T8_MOUNT_HORSE', name: 'Ngựa Cưỡi T8 Riding Horse', en: 'T8 Riding Horse', tier: 8 },
  { id: 'T5_MOUNT_ARMORED_HORSE', name: 'Ngựa Bọc Giáp T5 Armored Horse', en: 'T5 Armored Horse', tier: 5 },
  { id: 'T6_MOUNT_ARMORED_HORSE', name: 'Ngựa Bọc Giáp T6 Armored Horse', en: 'T6 Armored Horse', tier: 6 },
  { id: 'T7_MOUNT_ARMORED_HORSE', name: 'Ngựa Bọc Giáp T7 Armored Horse', en: 'T7 Armored Horse', tier: 7 },
  { id: 'T8_MOUNT_ARMORED_HORSE', name: 'Ngựa Bọc Giáp T8 Armored Horse', en: 'T8 Armored Horse', tier: 8 },
  { id: 'T3_MOUNT_OX', name: 'Bò Tải T3 Transport Ox', en: 'T3 Transport Ox', tier: 3 },
  { id: 'T4_MOUNT_OX', name: 'Bò Tải T4 Transport Ox', en: 'T4 Transport Ox', tier: 4 },
  { id: 'T5_MOUNT_OX', name: 'Bò Tải T5 Transport Ox', en: 'T5 Transport Ox', tier: 5 },
  { id: 'T6_MOUNT_OX', name: 'Bò Tải T6 Transport Ox', en: 'T6 Transport Ox', tier: 6 },
  { id: 'T7_MOUNT_OX', name: 'Bò Tải T7 Transport Ox', en: 'T7 Transport Ox', tier: 7 },
  { id: 'T8_MOUNT_OX', name: 'Bò Tải T8 Transport Ox', en: 'T8 Transport Ox', tier: 8 },
  { id: 'T6_MOUNT_DIREWOLF', name: 'Sói Hoang T6 Direwolf', en: 'T6 Direwolf', tier: 6 },
  { id: 'T7_MOUNT_DIREBEAR', name: 'Gấu Bạo Chúa T7 Direbear', en: 'T7 Direbear', tier: 7 },
  { id: 'T7_MOUNT_SWAMPDRAGON', name: 'Rồng Đầm Lầy T7 Swamp Dragon', en: 'T7 Swamp Dragon', tier: 7 },
  { id: 'T5_MOUNT_MOOSE', name: 'Nai T5 Saddled Moose', en: 'T5 Saddled Moose', tier: 5 },
  { id: 'T6_MOUNT_SWIFTCLAW', name: 'Hổ Nanh T6 Swiftclaw', en: 'T6 Swiftclaw', tier: 6 },
  { id: 'T8_MOUNT_MAMMOTH_TRANSPORT', name: 'Voi Ma Mút Tải T8 Transport Mammoth', en: 'T8 Transport Mammoth', tier: 8 }
];

for (let m of MOUNT_LIST) {
  items.push({
    id: m.id,
    name: m.name,
    enName: m.en,
    tier: m.tier,
    enchant: 0,
    category: 'mounts',
    subcategory: 'Mounts'
  });
}

// 5. Popular Weapons
const WEAPONS_BASE = [
  // Swords
  { code: 'MAIN_SWORD', vn: 'Kiếm 1 Tay Broadsword', en: 'Broadsword', sub: 'Swords' },
  { code: '2H_CLAYMORE', vn: 'Đại Kiếm Claymore', en: 'Claymore', sub: 'Swords' },
  { code: '2H_DUALSWORD', vn: 'Song Kiếm Dual Swords', en: 'Dual Swords', sub: 'Swords' },
  { code: 'MAIN_SCIMITAR_MORGANA', vn: 'Kiếm Morgana Clarent Blade', en: 'Clarent Blade', sub: 'Swords' },
  { code: '2H_CLEAVER_HELL', vn: 'Kiếm Đao Carving Sword', en: 'Carving Sword', sub: 'Swords' },
  { code: '2H_DUALSCYTHE_HELL', vn: 'Song Lưỡi Hái Galatine Pair', en: 'Galatine Pair', sub: 'Swords' },
  { code: '2H_CLAYMORE_AVALON', vn: 'Kiếm Đế Vương Kingmaker', en: 'Kingmaker', sub: 'Swords' },

  // Bows
  { code: '2H_BOW', vn: 'Cung Thường Bow', en: 'Bow', sub: 'Bows' },
  { code: '2H_WARBOW', vn: 'Chiến Cung Warbow', en: 'Warbow', sub: 'Bows' },
  { code: '2H_LONGBOW', vn: 'Trường Cung Longbow', en: 'Longbow', sub: 'Bows' },
  { code: '2H_LONGBOW_UNDEAD', vn: 'Cung Thì Thầm Whispering Bow', en: 'Whispering Bow', sub: 'Bows' },
  { code: '2H_BOW_HELL', vn: 'Cung Badon Bow of Badon', en: 'Bow of Badon', sub: 'Bows' },
  { code: '2H_BOW_AVALON', vn: 'Cung Sương Mistpiercer', en: 'Mistpiercer', sub: 'Bows' },

  // Daggers
  { code: 'MAIN_DAGGER', vn: 'Dao Găm 1 Tay 1h Dagger', en: 'Dagger', sub: 'Daggers' },
  { code: '2H_DAGGERPAIR', vn: 'Song Dao Dagger Pair', en: 'Dagger Pair', sub: 'Daggers' },
  { code: '2H_CLAWPAIR', vn: 'Vuốt Sắt Claws', en: 'Claws', sub: 'Daggers' },
  { code: 'MAIN_RAPIER_MORGANA', vn: 'Đoản Kiếm Huyết Bloodletter', en: 'Bloodletter', sub: 'Daggers' },
  { code: 'MAIN_DAGGER_HELL', vn: 'Nanh Quỷ Demonfang', en: 'Demonfang', sub: 'Daggers' },
  { code: '2H_DUALSICKLE_UNDEAD', vn: 'Lưỡi Hái Tử Thần Deathgivers', en: 'Deathgivers', sub: 'Daggers' },

  // Crossbows
  { code: '2H_CROSSBOW', vn: 'Nỏ Thường Crossbow', en: 'Crossbow', sub: 'Crossbows' },
  { code: 'MAIN_1H_CROSSBOW', vn: 'Nỏ Nhẹ Light Crossbow', en: 'Light Crossbow', sub: 'Crossbows' },
  { code: '2H_CROSSBOWLARGE', vn: 'Trọng Nỏ Heavy Crossbow', en: 'Heavy Crossbow', sub: 'Crossbows' },
  { code: '2H_REPEATINGCROSSBOW_UNDEAD', vn: 'Nỏ Bắn Nháp Boltcasters', en: 'Boltcasters', sub: 'Crossbows' },
  { code: '2H_CROSSBOWLARGE_MORGANA', vn: 'Nỏ Công Thành Siegebow', en: 'Siegebow', sub: 'Crossbows' },

  // Cursed
  { code: 'MAIN_CURSEDSTAFF', vn: 'Gậy Nguyền 1 Tay 1h Cursed Staff', en: '1h Cursed Staff', sub: 'Cursed Staves' },
  { code: '2H_CURSEDSTAFF', vn: 'Đại Trượng Nguyền Great Cursed Staff', en: 'Great Cursed Staff', sub: 'Cursed Staves' },
  { code: '2H_DEMONICSTAFF', vn: 'Trượng Quỷ Demonic Staff', en: 'Demonic Staff', sub: 'Cursed Staves' },
  { code: 'MAIN_CURSEDSTAFF_UNDEAD', vn: 'Bóng Đêm Shadowcaller', en: 'Shadowcaller', sub: 'Cursed Staves' },
  { code: '2H_SKULLORB_HELL', vn: 'Sọ Nguyền Cursed Skull', en: 'Cursed Skull', sub: 'Cursed Staves' },

  // Fire
  { code: 'MAIN_FIRESTAFF', vn: 'Trượng Lửa 1 Tay 1h Fire Staff', en: '1h Fire Staff', sub: 'Fire Staves' },
  { code: '2H_FIRESTAFF', vn: 'Đại Trượng Hỏa Great Fire Staff', en: 'Great Fire Staff', sub: 'Fire Staves' },
  { code: 'MAIN_FIRESTAFF_KEEPER', vn: 'Hỏa Cuồng Wildfire Staff', en: 'Wildfire Staff', sub: 'Fire Staves' },
  { code: '2H_INFERNOSTAFF', vn: 'Hỏa Ngục Infernal Staff', en: 'Infernal Staff', sub: 'Fire Staves' },
  { code: '2H_FIRE_RING_HELL', vn: 'Bão Lửa Blazing Staff', en: 'Blazing Staff', sub: 'Fire Staves' },

  // Frost
  { code: 'MAIN_FROSTSTAFF', vn: 'Trượng Băng 1 Tay 1h Frost Staff', en: '1h Frost Staff', sub: 'Frost Staves' },
  { code: '2H_FROSTSTAFF', vn: 'Đại Băng Trượng Great Frost Staff', en: 'Great Frost Staff', sub: 'Frost Staves' },
  { code: '2H_ICEGAUNTLETS_HELL', vn: 'Găng Vĩnh Cửu Permafrost Prism', en: 'Permafrost Prism', sub: 'Frost Staves' },

  // Holy & Nature
  { code: 'MAIN_HOLYSTAFF', vn: 'Trượng Thánh 1 Tay 1h Holy Staff', en: '1h Holy Staff', sub: 'Holy Staves' },
  { code: '2H_HOLYSTAFF', vn: 'Đại Trượng Thánh Great Holy Staff', en: 'Great Holy Staff', sub: 'Holy Staves' },
  { code: '2H_DIVINESTAFF', vn: 'Thần Trượng Divine Staff', en: 'Divine Staff', sub: 'Holy Staves' },
  { code: '2H_HOLYSTAFF_HELL', vn: 'Sa Ngã Fallen Staff', en: 'Fallen Staff', sub: 'Holy Staves' },
  { code: 'MAIN_HOLYSTAFF_AVALON', vn: 'Thánh Quang Hallowfall', en: 'Hallowfall', sub: 'Holy Staves' },
  { code: 'MAIN_NATURESTAFF', vn: 'Trượng Tự Nhiên 1h Nature Staff', en: '1h Nature Staff', sub: 'Nature Staves' },
  { code: '2H_WILDSTAFF', vn: 'Đại Trượng Hoang Dã Wild Staff', en: 'Wild Staff', sub: 'Nature Staves' },
  { code: '2H_NATURESTAFF_KEEPER', vn: 'Héo Úa Blight Staff', en: 'Blight Staff', sub: 'Nature Staves' },

  // Axes & Spears
  { code: 'MAIN_AXE', vn: 'Rìu 1 Tay Battleaxe', en: 'Battleaxe', sub: 'Axes' },
  { code: '2H_GREATAXE', vn: 'Đại Rìu Greataxe', en: 'Greataxe', sub: 'Axes' },
  { code: '2H_HALBERD', vn: 'Kích Halberd', en: 'Halberd', sub: 'Axes' },
  { code: '2H_SCYTHE_HELL', vn: 'Vuốt Gấu Bear Paws', en: 'Bear Paws', sub: 'Axes' },
  { code: '2H_AXE_AVALON', vn: 'Phá Vỡ Thế Giới Realmbreaker', en: 'Realmbreaker', sub: 'Axes' },
  { code: 'MAIN_SPEAR', vn: 'Thương 1 Tay 1h Spear', en: '1h Spear', sub: 'Spears' },
  { code: '2H_SPEAR', vn: 'Trường Thương Pike', en: 'Pike', sub: 'Spears' },
  { code: '2H_HARPOON_HELL', vn: 'Thợ Săn Linh Hồn Spirithunter', en: 'Spirithunter', sub: 'Spears' },

  // Shapeshifter
  { code: '2H_SHAPESHIFTER_MORGANA', vn: 'Gậy Thợ Săn Rình Mồi Prowling Staff', en: 'Prowling Staff', sub: 'Shapeshifter' }
];

for (let w of WEAPONS_BASE) {
  for (let t of [4, 5, 6, 7, 8]) {
    for (let enc of [0, 1, 2]) {
      const encStr = getEnchantSuffix(enc);
      items.push({
        id: `T${t}_${w.code}${encStr}`,
        name: `${w.vn} T${t}${enc > 0 ? ' .' + enc : ''}`,
        enName: `T${t} ${w.en}${enc > 0 ? ' .' + enc : ''}`,
        tier: t,
        enchant: enc,
        category: 'weapons',
        subcategory: w.sub
      });
    }
  }
}

// 6. Armors, Helmets, Boots
const ARMOR_BASE = [
  // Cloth
  { code: 'ARMOR_CLOTH_SET1', vn: 'Áo Vải Học Giả Scholar Robe', en: 'Scholar Robe', sub: 'Cloth Armor' },
  { code: 'ARMOR_CLOTH_SET2', vn: 'Áo Vải Giáo Sĩ Cleric Robe', en: 'Cleric Robe', sub: 'Cloth Armor' },
  { code: 'ARMOR_CLOTH_SET3', vn: 'Áo Vải Pháp Sư Mage Robe', en: 'Mage Robe', sub: 'Cloth Armor' },
  { code: 'ARMOR_CLOTH_HELL', vn: 'Áo Vải Cuồng Giáo Cultist Robe', en: 'Cultist Robe', sub: 'Cloth Armor' },
  { code: 'ARMOR_CLOTH_AVALON', vn: 'Áo Vải Thuần Khiết Robe of Purity', en: 'Robe of Purity', sub: 'Cloth Armor' },
  { code: 'HEAD_CLOTH_SET1', vn: 'Mũ Vải Học Giả Scholar Cowl', en: 'Scholar Cowl', sub: 'Cloth Helm' },
  { code: 'HEAD_CLOTH_SET2', vn: 'Mũ Vải Giáo Sĩ Cleric Cowl', en: 'Cleric Cowl', sub: 'Cloth Helm' },
  { code: 'HEAD_CLOTH_SET3', vn: 'Mũ Vải Pháp Sư Mage Cowl', en: 'Mage Cowl', sub: 'Cloth Helm' },
  { code: 'SHOES_CLOTH_SET1', vn: 'Dép Vải Học Giả Scholar Sandals', en: 'Scholar Sandals', sub: 'Cloth Shoes' },
  { code: 'SHOES_CLOTH_SET2', vn: 'Dép Vải Giáo Sĩ Cleric Sandals', en: 'Cleric Sandals', sub: 'Cloth Shoes' },

  // Leather
  { code: 'ARMOR_LEATHER_SET1', vn: 'Áo Da Lính Đánh Thuê Mercenary Jacket', en: 'Mercenary Jacket', sub: 'Leather Armor' },
  { code: 'ARMOR_LEATHER_SET2', vn: 'Áo Da Thợ Săn Hunter Jacket', en: 'Hunter Jacket', sub: 'Leather Armor' },
  { code: 'ARMOR_LEATHER_SET3', vn: 'Áo Da Sát Thủ Assassin Jacket', en: 'Assassin Jacket', sub: 'Leather Armor' },
  { code: 'ARMOR_LEATHER_MORGANA', vn: 'Áo Da Rình Rập Stalker Jacket', en: 'Stalker Jacket', sub: 'Leather Armor' },
  { code: 'ARMOR_LEATHER_HELL', vn: 'Áo Da Địa Ngục Hellion Jacket', en: 'Hellion Jacket', sub: 'Leather Armor' },
  { code: 'ARMOR_LEATHER_AVALON', vn: 'Áo Da Sương Mù Mistwalker Jacket', en: 'Mistwalker Jacket', sub: 'Leather Armor' },
  { code: 'HEAD_LEATHER_SET1', vn: 'Mũ Da Lính Đánh Thuê Mercenary Hood', en: 'Mercenary Hood', sub: 'Leather Helm' },
  { code: 'HEAD_LEATHER_SET2', vn: 'Mũ Da Thợ Săn Hunter Hood', en: 'Hunter Hood', sub: 'Leather Helm' },
  { code: 'HEAD_LEATHER_SET3', vn: 'Mũ Da Sát Thủ Assassin Hood', en: 'Assassin Hood', sub: 'Leather Helm' },
  { code: 'HEAD_LEATHER_MORGANA', vn: 'Mũ Da Rình Rập Stalker Hood', en: 'Stalker Hood', sub: 'Leather Helm' },
  { code: 'SHOES_LEATHER_SET3', vn: 'Giày Da Sát Thủ Assassin Shoes', en: 'Assassin Shoes', sub: 'Leather Shoes' },

  // Plate
  { code: 'ARMOR_PLATE_SET1', vn: 'Giáp Sắt Chiến Binh Soldier Armor', en: 'Soldier Armor', sub: 'Plate Armor' },
  { code: 'ARMOR_PLATE_SET2', vn: 'Giáp Sắt Hiệp Sĩ Knight Armor', en: 'Knight Armor', sub: 'Plate Armor' },
  { code: 'ARMOR_PLATE_SET3', vn: 'Giáp Sắt Vệ Binh Guardian Armor', en: 'Guardian Armor', sub: 'Plate Armor' },
  { code: 'ARMOR_PLATE_HELL', vn: 'Giáp Sắt Quỷ Vương Demon Armor', en: 'Demon Armor', sub: 'Plate Armor' },
  { code: 'ARMOR_PLATE_AVALON', vn: 'Giáp Sắt Dũng Cảm Armor of Valor', en: 'Armor of Valor', sub: 'Plate Armor' },
  { code: 'HEAD_PLATE_SET1', vn: 'Mũ Sắt Chiến Binh Soldier Helmet', en: 'Soldier Helmet', sub: 'Plate Helm' },
  { code: 'HEAD_PLATE_SET2', vn: 'Mũ Sắt Hiệp Sĩ Knight Helmet', en: 'Knight Helmet', sub: 'Plate Helm' },
  { code: 'HEAD_PLATE_SET3', vn: 'Mũ Sắt Vệ Binh Guardian Helmet', en: 'Guardian Helmet', sub: 'Plate Helm' },
  { code: 'SHOES_PLATE_SET1', vn: 'Ủng Sắt Chiến Binh Soldier Boots', en: 'Soldier Boots', sub: 'Plate Boots' },
  { code: 'SHOES_PLATE_SET2', vn: 'Ủng Sắt Hiệp Sĩ Knight Boots', en: 'Knight Boots', sub: 'Plate Boots' }
];

for (let a of ARMOR_BASE) {
  for (let t of [4, 5, 6, 7, 8]) {
    for (let enc of [0, 1, 2]) {
      const encStr = getEnchantSuffix(enc);
      items.push({
        id: `T${t}_${a.code}${encStr}`,
        name: `${a.vn} T${t}${enc > 0 ? ' .' + enc : ''}`,
        enName: `T${t} ${a.en}${enc > 0 ? ' .' + enc : ''}`,
        tier: t,
        enchant: enc,
        category: 'armor',
        subcategory: a.sub
      });
    }
  }
}

// 7. Consumables (Food & Potions)
const CONSUMABLES = [
  // Food
  { id: 'T7_MEAL_ROAST', name: 'Thịt Heo Nướng T7 Pork Roast', en: 'T7 Pork Roast', tier: 7, sub: 'Food' },
  { id: 'T7_MEAL_ROAST@1', name: 'Thịt Heo Nướng T7.1 Pork Roast', en: 'T7.1 Pork Roast', tier: 7, sub: 'Food' },
  { id: 'T7_MEAL_OMELETTE', name: 'Trứng Chiên Thịt Heo T7 Pork Omelette', en: 'T7 Pork Omelette', tier: 7, sub: 'Food' },
  { id: 'T7_MEAL_OMELETTE@1', name: 'Trứng Chiên T7.1 Pork Omelette', en: 'T7.1 Pork Omelette', tier: 7, sub: 'Food' },
  { id: 'T7_MEAL_OMELETTE@2', name: 'Trứng Chiên T7.2 Pork Omelette', en: 'T7.2 Pork Omelette', tier: 7, sub: 'Food' },
  { id: 'T7_MEAL_OMELETTE_AVALON', name: 'Trứng Chiên Avalon T7 Avalonian Pork Omelette', en: 'T7 Avalonian Pork Omelette', tier: 7, sub: 'Food' },
  { id: 'T7_MEAL_OMELETTE_AVALON@1', name: 'Trứng Chiên Avalon T7.1 Avalonian Pork Omelette', en: 'T7.1 Avalonian Pork Omelette', tier: 7, sub: 'Food' },
  { id: 'T8_MEAL_STEW', name: 'Bò Hầm T8 Beef Stew', en: 'T8 Beef Stew', tier: 8, sub: 'Food' },
  { id: 'T8_MEAL_STEW@1', name: 'Bò Hầm T8.1 Beef Stew', en: 'T8.1 Beef Stew', tier: 8, sub: 'Food' },
  { id: 'T8_MEAL_STEW@2', name: 'Bò Hầm T8.2 Beef Stew', en: 'T8.2 Beef Stew', tier: 8, sub: 'Food' },
  { id: 'T8_MEAL_STEW_AVALON', name: 'Bò Hầm Avalon T8 Avalonian Beef Stew', en: 'T8 Avalonian Beef Stew', tier: 8, sub: 'Food' },
  { id: 'T8_MEAL_STEW_AVALON@1', name: 'Bò Hầm Avalon T8.1 Avalonian Beef Stew', en: 'T8.1 Avalonian Beef Stew', tier: 8, sub: 'Food' },
  { id: 'T8_MEAL_EELSTEW', name: 'Lươn Hầm T8 Deadwater Eel Stew', en: 'T8 Deadwater Eel Stew', tier: 8, sub: 'Food' },
  { id: 'T6_MEAL_SANDWICH', name: 'Bánh Mì Thịt Bò T6 Beef Sandwich', en: 'T6 Beef Sandwich', tier: 6, sub: 'Food' },

  // Potions
  { id: 'T4_POTION_HEAL', name: 'Bình Máu T4 Minor Healing Potion', en: 'T4 Healing Potion', tier: 4, sub: 'Potions' },
  { id: 'T6_POTION_HEAL', name: 'Bình Máu T6 Major Healing Potion', en: 'T6 Healing Potion', tier: 6, sub: 'Potions' },
  { id: 'T4_POTION_ENERGY', name: 'Bình Năng Lượng T4 Energy Potion', en: 'T4 Energy Potion', tier: 4, sub: 'Potions' },
  { id: 'T6_POTION_ENERGY', name: 'Bình Năng Lượng T6 Major Energy Potion', en: 'T6 Energy Potion', tier: 6, sub: 'Potions' },
  { id: 'T4_POTION_COOLDOWN', name: 'Bình Giảm Hồi Chiêu T4 Minor Poison', en: 'T4 Poison Potion', tier: 4, sub: 'Potions' },
  { id: 'T6_POTION_COOLDOWN', name: 'Bình Độc T6 Major Poison Potion', en: 'T6 Poison Potion', tier: 6, sub: 'Potions' },
  { id: 'T8_POTION_COOLDOWN', name: 'Bình Độc Cực Đại T8 Major Poison Potion', en: 'T8 Poison Potion', tier: 8, sub: 'Potions' },
  { id: 'T4_POTION_STONESKIN', name: 'Bình Kháng Hiệu Ứng T4 Resistance Potion', en: 'T4 Resistance Potion', tier: 4, sub: 'Potions' },
  { id: 'T7_POTION_STONESKIN', name: 'Bình Kháng Hiệu Ứng T7 Major Resistance Potion', en: 'T7 Resistance Potion', tier: 7, sub: 'Potions' },
  { id: 'T4_POTION_REVIVE', name: 'Bình Khổng Lồ T4 Gigantify Potion', en: 'T4 Gigantify Potion', tier: 4, sub: 'Potions' },
  { id: 'T7_POTION_REVIVE', name: 'Bình Khổng Lồ T7 Major Gigantify Potion', en: 'T7 Gigantify Potion', tier: 7, sub: 'Potions' },
  { id: 'T8_POTION_SLOWFIELD', name: 'Bình Tàng Hình T8 Invisibility Potion', en: 'T8 Invisibility Potion', tier: 8, sub: 'Potions' }
];

for (let c of CONSUMABLES) {
  items.push({
    id: c.id,
    name: c.name,
    enName: c.en,
    tier: c.tier,
    enchant: c.id.includes('@') ? parseInt(c.id.split('@')[1]) : 0,
    category: 'consumables',
    subcategory: c.sub
  });
}

// 8. Refined Materials
const MATERIALS = [
  { code: 'PLANKS', vn: 'Ván Gỗ Planks', en: 'Planks' },
  { code: 'METALBAR', vn: 'Thỏi Kim Loại Metal Bars', en: 'Metal Bar' },
  { code: 'LEATHER', vn: 'Da Thuộc Leather', en: 'Leather' },
  { code: 'CLOTH', vn: 'Vải Dệt Cloth', en: 'Cloth' },
  { code: 'STONEBLOCK', vn: 'Khối Đá Stone Blocks', en: 'Stone Block' }
];

for (let m of MATERIALS) {
  for (let t of [4, 5, 6, 7, 8]) {
    for (let enc of [0, 1, 2, 3]) {
      const encStr = getEnchantSuffix(enc);
      items.push({
        id: `T${t}_${m.code}${encStr}`,
        name: `${m.vn} T${t}${enc > 0 ? ' .' + enc : ''}`,
        enName: `T${t} ${m.en}${enc > 0 ? ' .' + enc : ''}`,
        tier: t,
        enchant: enc,
        category: 'materials',
        subcategory: 'Refined'
      });
    }
  }
}

// 9. Runes, Souls, Relics
for (let t of [4, 5, 6, 7, 8]) {
  items.push(
    { id: `T${t}_RUNE`, name: `Rune T${t}`, enName: `T${t} Rune`, tier: t, enchant: 0, category: 'materials', subcategory: 'Artifacts' },
    { id: `T${t}_SOUL`, name: `Soul T${t}`, enName: `T${t} Soul`, tier: t, enchant: 0, category: 'materials', subcategory: 'Artifacts' },
    { id: `T${t}_RELIC`, name: `Relic T${t}`, enName: `T${t} Relic`, tier: t, enchant: 0, category: 'materials', subcategory: 'Artifacts' },
    { id: `T${t}_SHARD_AVALONIAN`, name: `Mảnh Avalon T${t} Shard`, enName: `T${t} Avalonian Shard`, tier: t, enchant: 0, category: 'materials', subcategory: 'Artifacts' }
  );
}

// Output to js/items.js
const content = `// Curated Database of High-Liquidity Albion Online Trade Items
// Total items: ${items.length}
window.ALBION_ITEMS = ${JSON.stringify(items, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'data', 'items.js'), content, 'utf8');
console.log(`Generated ${items.length} items in data/items.js!`);
