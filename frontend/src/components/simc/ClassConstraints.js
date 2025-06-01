// Class and spec constraints for equipment validation
export const ARMOR_TYPES = {
  CLOTH: 'cloth',
  LEATHER: 'leather',
  MAIL: 'mail',
  PLATE: 'plate'
};

export const WEAPON_TYPES = {
  // One-handed
  DAGGER: 'dagger',
  SWORD_1H: 'sword_1h',
  AXE_1H: 'axe_1h',
  MACE_1H: 'mace_1h',
  FIST: 'fist',
  WAND: 'wand',
  
  // Two-handed
  SWORD_2H: 'sword_2h',
  AXE_2H: 'axe_2h',
  MACE_2H: 'mace_2h',
  POLEARM: 'polearm',
  STAFF: 'staff',
  
  // Ranged
  BOW: 'bow',
  CROSSBOW: 'crossbow',
  GUN: 'gun',
  THROWN: 'thrown',
  WARGLAIVE: 'warglaive',
  
  // Off-hand
  SHIELD: 'shield',
  OFFHAND: 'offhand' // Held in off-hand items
};

export const PRIMARY_STATS = {
  STR: 'str',
  AGI: 'agi',
  INT: 'int'
};

// Weapon slot combinations for different weapon setups
export const WEAPON_CONFIGURATIONS = {
  DUAL_WIELD: 'dual_wield',        // Two one-handed weapons
  WEAPON_SHIELD: 'weapon_shield',  // One-handed weapon + shield
  WEAPON_OFFHAND: 'weapon_offhand', // One-handed weapon + off-hand item
  TWO_HANDED: 'two_handed',        // Single two-handed weapon
  SINGLE_HANDED: 'single_handed'   // Single one-handed weapon (no off-hand)
};

// Class definitions with their constraints
export const CLASS_CONSTRAINTS = {
  warrior: {
    name: 'Warrior',
    primaryStat: PRIMARY_STATS.STR,
    armorType: ARMOR_TYPES.PLATE,
    weaponTypes: [
      WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.SWORD_2H,
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.AXE_2H,
      WEAPON_TYPES.MACE_1H, WEAPON_TYPES.MACE_2H,
      WEAPON_TYPES.POLEARM, WEAPON_TYPES.FIST,
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.SHIELD,
      WEAPON_TYPES.BOW, WEAPON_TYPES.CROSSBOW,
      WEAPON_TYPES.GUN, WEAPON_TYPES.THROWN
    ],
    specs: {
      arms: {
        name: 'Arms',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.TWO_HANDED],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_2H, WEAPON_TYPES.AXE_2H,
          WEAPON_TYPES.MACE_2H, WEAPON_TYPES.POLEARM
        ]
      },
      fury: {
        name: 'Fury',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.SWORD_2H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.AXE_2H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.MACE_2H,
          WEAPON_TYPES.FIST, WEAPON_TYPES.DAGGER
        ],
        specialRules: {
          titanGrip: true // Can dual-wield two-handed weapons
        }
      },
      protection: {
        name: 'Protection',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.WEAPON_SHIELD],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.FIST,
          WEAPON_TYPES.DAGGER
        ],
        requiredOffHand: [WEAPON_TYPES.SHIELD]
      }
    }
  },

  paladin: {
    name: 'Paladin',
    primaryStat: PRIMARY_STATS.STR,
    armorType: ARMOR_TYPES.PLATE,
    weaponTypes: [
      WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.SWORD_2H,
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.AXE_2H,
      WEAPON_TYPES.MACE_1H, WEAPON_TYPES.MACE_2H,
      WEAPON_TYPES.POLEARM, WEAPON_TYPES.SHIELD
    ],
    specs: {
      holy: {
        name: 'Holy',
        primaryStat: PRIMARY_STATS.INT,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_SHIELD,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.SWORD_2H, WEAPON_TYPES.MACE_2H,
          WEAPON_TYPES.POLEARM
        ]
      },
      protection: {
        name: 'Protection',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.WEAPON_SHIELD],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H
        ],
        requiredOffHand: [WEAPON_TYPES.SHIELD]
      },
      retribution: {
        name: 'Retribution',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.TWO_HANDED],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_2H, WEAPON_TYPES.AXE_2H,
          WEAPON_TYPES.MACE_2H, WEAPON_TYPES.POLEARM
        ]
      }
    }
  },

  hunter: {
    name: 'Hunter',
    primaryStat: PRIMARY_STATS.AGI,
    armorType: ARMOR_TYPES.MAIL,
    weaponTypes: [
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.AXE_2H,
      WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.SWORD_2H,
      WEAPON_TYPES.FIST, WEAPON_TYPES.DAGGER,
      WEAPON_TYPES.POLEARM, WEAPON_TYPES.STAFF,
      WEAPON_TYPES.BOW, WEAPON_TYPES.CROSSBOW,
      WEAPON_TYPES.GUN
    ],
    specs: {
      beast_mastery: {
        name: 'Beast Mastery',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.TWO_HANDED],
        preferredWeapons: [
          WEAPON_TYPES.BOW, WEAPON_TYPES.CROSSBOW,
          WEAPON_TYPES.GUN
        ],
        requiredRanged: true
      },
      marksmanship: {
        name: 'Marksmanship',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.TWO_HANDED],
        preferredWeapons: [
          WEAPON_TYPES.BOW, WEAPON_TYPES.CROSSBOW,
          WEAPON_TYPES.GUN
        ],
        requiredRanged: true
      },
      survival: {
        name: 'Survival',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.TWO_HANDED,
          WEAPON_CONFIGURATIONS.DUAL_WIELD
        ],
        preferredWeapons: [
          WEAPON_TYPES.POLEARM, WEAPON_TYPES.STAFF,
          WEAPON_TYPES.AXE_2H, WEAPON_TYPES.SWORD_2H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.FIST, WEAPON_TYPES.DAGGER
        ]
      }
    }
  },

  rogue: {
    name: 'Rogue',
    primaryStat: PRIMARY_STATS.AGI,
    armorType: ARMOR_TYPES.LEATHER,
    weaponTypes: [
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.SWORD_1H,
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
      WEAPON_TYPES.FIST, WEAPON_TYPES.BOW,
      WEAPON_TYPES.CROSSBOW, WEAPON_TYPES.GUN,
      WEAPON_TYPES.THROWN
    ],
    specs: {
      assassination: {
        name: 'Assassination',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [WEAPON_TYPES.DAGGER],
        requiredMainHand: [WEAPON_TYPES.DAGGER]
      },
      outlaw: {
        name: 'Outlaw',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.FIST,
          WEAPON_TYPES.DAGGER
        ]
      },
      subtlety: {
        name: 'Subtlety',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [WEAPON_TYPES.DAGGER],
        requiredMainHand: [WEAPON_TYPES.DAGGER]
      }
    }
  },

  priest: {
    name: 'Priest',
    primaryStat: PRIMARY_STATS.INT,
    armorType: ARMOR_TYPES.CLOTH,
    weaponTypes: [
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.MACE_1H,
      WEAPON_TYPES.STAFF, WEAPON_TYPES.WAND,
      WEAPON_TYPES.OFFHAND
    ],
    specs: {
      discipline: {
        name: 'Discipline',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      },
      holy: {
        name: 'Holy',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      },
      shadow: {
        name: 'Shadow',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      }
    }
  },

  shaman: {
    name: 'Shaman',
    primaryStat: PRIMARY_STATS.AGI, // Default, overridden by specs
    armorType: ARMOR_TYPES.MAIL,
    weaponTypes: [
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.AXE_2H,
      WEAPON_TYPES.MACE_1H, WEAPON_TYPES.MACE_2H,
      WEAPON_TYPES.FIST, WEAPON_TYPES.DAGGER,
      WEAPON_TYPES.STAFF, WEAPON_TYPES.SHIELD,
      WEAPON_TYPES.OFFHAND
    ],
    specs: {
      elemental: {
        name: 'Elemental',
        primaryStat: PRIMARY_STATS.INT,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_SHIELD,
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.DAGGER,
          WEAPON_TYPES.FIST
        ]
      },
      enhancement: {
        name: 'Enhancement',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.FIST, WEAPON_TYPES.DAGGER
        ]
      },
      restoration: {
        name: 'Restoration',
        primaryStat: PRIMARY_STATS.INT,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_SHIELD,
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.DAGGER,
          WEAPON_TYPES.FIST
        ]
      }
    }
  },

  mage: {
    name: 'Mage',
    primaryStat: PRIMARY_STATS.INT,
    armorType: ARMOR_TYPES.CLOTH,
    weaponTypes: [
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.SWORD_1H,
      WEAPON_TYPES.STAFF, WEAPON_TYPES.WAND,
      WEAPON_TYPES.OFFHAND
    ],
    specs: {
      arcane: {
        name: 'Arcane',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      },
      fire: {
        name: 'Fire',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      },
      frost: {
        name: 'Frost',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      }
    }
  },

  warlock: {
    name: 'Warlock',
    primaryStat: PRIMARY_STATS.INT,
    armorType: ARMOR_TYPES.CLOTH,
    weaponTypes: [
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.SWORD_1H,
      WEAPON_TYPES.STAFF, WEAPON_TYPES.WAND,
      WEAPON_TYPES.OFFHAND
    ],
    specs: {
      affliction: {
        name: 'Affliction',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      },
      demonology: {
        name: 'Demonology',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      },
      destruction: {
        name: 'Destruction',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.WAND
        ]
      }
    }
  },

  monk: {
    name: 'Monk',
    primaryStat: PRIMARY_STATS.AGI, // Default, overridden by specs
    armorType: ARMOR_TYPES.LEATHER,
    weaponTypes: [
      WEAPON_TYPES.FIST, WEAPON_TYPES.SWORD_1H,
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
      WEAPON_TYPES.POLEARM, WEAPON_TYPES.STAFF
    ],
    specs: {
      brewmaster: {
        name: 'Brewmaster',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.DUAL_WIELD,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.FIST, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.POLEARM, WEAPON_TYPES.STAFF
        ]
      },
      mistweaver: {
        name: 'Mistweaver',
        primaryStat: PRIMARY_STATS.INT,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.DUAL_WIELD,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.FIST,
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.POLEARM
        ]
      },
      windwalker: {
        name: 'Windwalker',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.DUAL_WIELD,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.FIST, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.POLEARM, WEAPON_TYPES.STAFF
        ]
      }
    }
  },

  druid: {
    name: 'Druid',
    primaryStat: PRIMARY_STATS.AGI, // Default, overridden by specs
    armorType: ARMOR_TYPES.LEATHER,
    weaponTypes: [
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.FIST,
      WEAPON_TYPES.MACE_1H, WEAPON_TYPES.MACE_2H,
      WEAPON_TYPES.POLEARM, WEAPON_TYPES.STAFF,
      WEAPON_TYPES.OFFHAND
    ],
    specs: {
      balance: {
        name: 'Balance',
        primaryStat: PRIMARY_STATS.INT,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.FIST,
          WEAPON_TYPES.POLEARM, WEAPON_TYPES.MACE_2H
        ]
      },
      feral: {
        name: 'Feral',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.TWO_HANDED,
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.POLEARM,
          WEAPON_TYPES.MACE_2H, WEAPON_TYPES.FIST,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.MACE_1H
        ]
      },
      guardian: {
        name: 'Guardian',
        primaryStat: PRIMARY_STATS.AGI,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.TWO_HANDED,
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.POLEARM,
          WEAPON_TYPES.MACE_2H, WEAPON_TYPES.FIST,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.MACE_1H
        ]
      },
      restoration: {
        name: 'Restoration',
        primaryStat: PRIMARY_STATS.INT,
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.DAGGER, WEAPON_TYPES.FIST,
          WEAPON_TYPES.POLEARM, WEAPON_TYPES.MACE_2H
        ]
      }
    }
  },

  demon_hunter: {
    name: 'Demon Hunter',
    primaryStat: PRIMARY_STATS.AGI,
    armorType: ARMOR_TYPES.LEATHER,
    weaponTypes: [
      WEAPON_TYPES.WARGLAIVE, WEAPON_TYPES.SWORD_1H,
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.FIST
    ],
    specs: {
      havoc: {
        name: 'Havoc',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [
          WEAPON_TYPES.WARGLAIVE, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.FIST
        ]
      },
      vengeance: {
        name: 'Vengeance',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.DUAL_WIELD],
        preferredWeapons: [
          WEAPON_TYPES.WARGLAIVE, WEAPON_TYPES.SWORD_1H,
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.FIST
        ]
      }
    }
  },

  death_knight: {
    name: 'Death Knight',
    primaryStat: PRIMARY_STATS.STR,
    armorType: ARMOR_TYPES.PLATE,
    weaponTypes: [
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.AXE_2H,
      WEAPON_TYPES.MACE_1H, WEAPON_TYPES.MACE_2H,
      WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.SWORD_2H,
      WEAPON_TYPES.POLEARM
    ],
    specs: {
      blood: {
        name: 'Blood',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.TWO_HANDED],
        preferredWeapons: [
          WEAPON_TYPES.AXE_2H, WEAPON_TYPES.MACE_2H,
          WEAPON_TYPES.SWORD_2H, WEAPON_TYPES.POLEARM
        ]
      },
      frost: {
        name: 'Frost',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.DUAL_WIELD,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_2H,
          WEAPON_TYPES.MACE_2H, WEAPON_TYPES.SWORD_2H,
          WEAPON_TYPES.POLEARM
        ]
      },
      unholy: {
        name: 'Unholy',
        weaponConfigurations: [WEAPON_CONFIGURATIONS.TWO_HANDED],
        preferredWeapons: [
          WEAPON_TYPES.AXE_2H, WEAPON_TYPES.MACE_2H,
          WEAPON_TYPES.SWORD_2H, WEAPON_TYPES.POLEARM
        ]
      }
    }
  },

  evoker: {
    name: 'Evoker',
    primaryStat: PRIMARY_STATS.INT,
    armorType: ARMOR_TYPES.MAIL,
    weaponTypes: [
      WEAPON_TYPES.DAGGER, WEAPON_TYPES.SWORD_1H,
      WEAPON_TYPES.AXE_1H, WEAPON_TYPES.MACE_1H,
      WEAPON_TYPES.FIST, WEAPON_TYPES.STAFF,
      WEAPON_TYPES.OFFHAND
    ],
    specs: {
      devastation: {
        name: 'Devastation',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.DAGGER,
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.FIST
        ]
      },
      preservation: {
        name: 'Preservation',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.DAGGER,
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.FIST
        ]
      },
      augmentation: {
        name: 'Augmentation',
        weaponConfigurations: [
          WEAPON_CONFIGURATIONS.WEAPON_OFFHAND,
          WEAPON_CONFIGURATIONS.TWO_HANDED
        ],
        preferredWeapons: [
          WEAPON_TYPES.STAFF, WEAPON_TYPES.DAGGER,
          WEAPON_TYPES.SWORD_1H, WEAPON_TYPES.AXE_1H,
          WEAPON_TYPES.MACE_1H, WEAPON_TYPES.FIST
        ]
      }
    }
  }
};

// Helper functions for constraint checking
export const ConstraintValidator = {
  // Get class constraints for a given class
  getClassConstraints: (className) => {
    return CLASS_CONSTRAINTS[className?.toLowerCase()] || null;
  },

  // Get spec constraints for a given class and spec
  getSpecConstraints: (className, specName) => {
    const classData = CLASS_CONSTRAINTS[className?.toLowerCase()];
    if (!classData) return null;
    
    return classData.specs[specName?.toLowerCase()] || null;
  },

  // Get effective primary stat for a class/spec combination
  getPrimaryStat: (className, specName) => {
    const specData = ConstraintValidator.getSpecConstraints(className, specName);
    const classData = ConstraintValidator.getClassConstraints(className);
    
    return specData?.primaryStat || classData?.primaryStat || null;
  },

  // Get effective armor type for a class/spec combination
  getArmorType: (className, specName) => {
    const specData = ConstraintValidator.getSpecConstraints(className, specName);
    const classData = ConstraintValidator.getClassConstraints(className);
    
    return specData?.armorType || classData?.armorType || null;
  },

  // Check if a weapon type is valid for a class/spec
  isWeaponTypeValid: (className, specName, weaponType, slot = 'main_hand') => {
    const classData = ConstraintValidator.getClassConstraints(className);
    const specData = ConstraintValidator.getSpecConstraints(className, specName);
    
    if (!classData) return { valid: false, constraint: 'hard' };

    // Check if class can use this weapon type at all
    if (!classData.weaponTypes.includes(weaponType)) {
      return { valid: false, constraint: 'hard' };
    }

    // Check spec-specific requirements
    if (specData) {
      // Check if spec has required weapons for specific slots
      if (slot === 'main_hand' && specData.requiredMainHand) {
        if (!specData.requiredMainHand.includes(weaponType)) {
          return { valid: false, constraint: 'hard' };
        }
      }
      
      if (slot === 'off_hand' && specData.requiredOffHand) {
        if (!specData.requiredOffHand.includes(weaponType)) {
          return { valid: false, constraint: 'hard' };
        }
      }

      // Check if weapon is preferred for the spec (soft constraint)
      if (specData.preferredWeapons && !specData.preferredWeapons.includes(weaponType)) {
        return { valid: true, constraint: 'soft' };
      }
    }

    return { valid: true, constraint: 'none' };
  },

  // Check if an armor type is valid for a class/spec
  isArmorTypeValid: (className, specName, armorType) => {
    const preferredArmor = ConstraintValidator.getArmorType(className, specName);
    
    if (!preferredArmor) return { valid: false, constraint: 'hard' };

    const armorHierarchy = [
      ARMOR_TYPES.CLOTH,
      ARMOR_TYPES.LEATHER,
      ARMOR_TYPES.MAIL,
      ARMOR_TYPES.PLATE
    ];

    const preferredIndex = armorHierarchy.indexOf(preferredArmor);
    const itemIndex = armorHierarchy.indexOf(armorType);

    if (itemIndex < 0) return { valid: false, constraint: 'hard' };
    
    if (itemIndex > preferredIndex) {
      return { valid: false, constraint: 'hard' };
    } else if (itemIndex < preferredIndex) {
      return { valid: true, constraint: 'soft' };
    }

    return { valid: true, constraint: 'none' };
  },

  // Check if a primary stat is valid for a class/spec
  isPrimaryStatValid: (className, specName, itemPrimaryStat) => {
    const preferredStat = ConstraintValidator.getPrimaryStat(className, specName);
    
    if (!preferredStat || !itemPrimaryStat) {
      return { valid: true, constraint: 'none' };
    }

    if (itemPrimaryStat === preferredStat) {
      return { valid: true, constraint: 'none' };
    }

    return { valid: true, constraint: 'soft' };
  },

  // Check if a weapon configuration is valid for a spec
  isWeaponConfigurationValid: (className, specName, configuration) => {
    const specData = ConstraintValidator.getSpecConstraints(className, specName);
    
    if (!specData || !specData.weaponConfigurations) {
      return { valid: true, constraint: 'none' };
    }

    if (specData.weaponConfigurations.includes(configuration)) {
      return { valid: true, constraint: 'none' };
    }

    return { valid: false, constraint: 'hard' };
  },

  // Get all valid weapon configurations for a spec
  getValidWeaponConfigurations: (className, specName) => {
    const specData = ConstraintValidator.getSpecConstraints(className, specName);
    
    if (!specData || !specData.weaponConfigurations) {
      return [WEAPON_CONFIGURATIONS.TWO_HANDED, WEAPON_CONFIGURATIONS.DUAL_WIELD];
    }

    return specData.weaponConfigurations;
  }
};

export default CLASS_CONSTRAINTS;