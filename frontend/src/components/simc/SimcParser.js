import { ConstraintValidator } from './ClassConstraints';

export class SimcParser {
  // Extract class and spec from SimC input
  static extractCharacterInfo(simcInput) {
    const lines = simcInput.split('\n');
    let characterInfo = {
      class: null,
      spec: null,
      name: 'Character',
      level: null,
      race: null,
      region: null,
      server: null
    };

    // Extract character name from comment
    const commentLine = lines.find(line => line.startsWith('#'));
    if (commentLine) {
      const match = commentLine.match(/^#\s*([^\s-]+)/);
      if (match && match[1]) {
        characterInfo.name = match[1];
      }
    }

    // Extract other character information
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//')) continue;

      if (line.startsWith('spec=')) {
        characterInfo.spec = line.substring(5).toLowerCase();
        
        // Determine class from spec
        characterInfo.class = SimcParser.getClassFromSpec(characterInfo.spec);
      } else if (line.startsWith('level=')) {
        characterInfo.level = parseInt(line.substring(6));
      } else if (line.startsWith('race=')) {
        characterInfo.race = line.substring(5);
      } else if (line.startsWith('region=')) {
        characterInfo.region = line.substring(7);
      } else if (line.startsWith('server=')) {
        characterInfo.server = line.substring(7);
      }

      // Also check for direct class definitions (like "rogue=CharacterName")
      const classMatch = line.match(/^([a-z_]+)="?([^"]+)"?$/);
      if (classMatch) {
        const possibleClass = classMatch[1].toLowerCase();
        if (ConstraintValidator.getClassConstraints(possibleClass)) {
          characterInfo.class = possibleClass;
          characterInfo.name = classMatch[2];
        }
      }
    }

    return characterInfo;
  }

  // Map specs to their respective classes
  static getClassFromSpec(specName) {
    const specClassMap = {
      // Warrior
      'arms': 'warrior',
      'fury': 'warrior',
      'protection': 'warrior',
      
      // Paladin
      'holy': 'paladin', // Note: Both paladin and priest have holy
      'retribution': 'paladin',
      // 'protection': 'paladin', // Same name as warrior, handled by context
      
      // Hunter
      'beast_mastery': 'hunter',
      'marksmanship': 'hunter',
      'survival': 'hunter',
      
      // Rogue
      'assassination': 'rogue',
      'outlaw': 'rogue',
      'subtlety': 'rogue',
      
      // Priest (holy conflicts with paladin, needs context)
      'discipline': 'priest',
      'shadow': 'priest',
      
      // Death Knight
      'blood': 'death_knight',
      'frost': 'death_knight', // Note: Also shaman, needs context
      'unholy': 'death_knight',
      
      // Shaman (frost conflicts with death knight)
      'elemental': 'shaman',
      'enhancement': 'shaman',
      'restoration': 'shaman', // Note: Also druid, needs context
      
      // Mage
      'arcane': 'mage',
      'fire': 'mage',
      // 'frost': 'mage', // Conflicts with death knight and shaman
      
      // Warlock
      'affliction': 'warlock',
      'demonology': 'warlock',
      'destruction': 'warlock',
      
      // Monk
      'brewmaster': 'monk',
      'mistweaver': 'monk',
      'windwalker': 'monk',
      
      // Druid (restoration conflicts with shaman)
      'balance': 'druid',
      'feral': 'druid',
      'guardian': 'druid',
      
      // Demon Hunter
      'havoc': 'demon_hunter',
      'vengeance': 'demon_hunter',
      
      // Evoker
      'devastation': 'evoker',
      'preservation': 'evoker',
      'augmentation': 'evoker'
    };

    return specClassMap[specName] || null;
  }

  // Parse SimC input and extract equipped items
  static parseEquippedItems(simcInput) {
    const lines = simcInput.split('\n');
    const equippedItems = {};
    
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//')) continue;
      
      // Match equipment lines like: head=,id=231824,gem_id=213743,bonus_id=...
      const equipMatch = line.match(/^([a-z_]+)=,(.+)$/);
      if (equipMatch) {
        const slot = equipMatch[1];
        const itemData = equipMatch[2];
        
        equippedItems[slot] = SimcParser.parseItemData(itemData);
      }
    }
    
    return equippedItems;
  }

  // Parse individual item data from SimC format
  static parseItemData(itemDataString) {
    const parts = itemDataString.split(',');
    const item = {};
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key || !value) continue;
      
      switch (key) {
        case 'id':
          item.id = parseInt(value);
          break;
        case 'enchant_id':
          item.enchant_id = parseInt(value);
          break;
        case 'gem_id':
          item.gem_id = value.split('/').map(id => parseInt(id));
          break;
        case 'bonus_id':
          item.bonus_id = value.split('/').map(id => parseInt(id));
          break;
        case 'crafted_stats':
          item.crafted_stats = value.split('/').map(id => parseInt(id));
          break;
      }
    }
    
    return item;
  }

  // Create character info string for SimC output
  static createCharacterInfoString(characterInfo) {
    const charInfo = [];
    
    if (characterInfo.class && characterInfo.name) {
      charInfo.push(`${characterInfo.class}="${characterInfo.name}"`);
    }
    
    if (characterInfo.level) {
      charInfo.push(`level=${characterInfo.level}`);
    }
    
    if (characterInfo.race) {
      charInfo.push(`race=${characterInfo.race}`);
    }
    
    if (characterInfo.region) {
      charInfo.push(`region=${characterInfo.region}`);
    }
    
    if (characterInfo.server) {
      charInfo.push(`server=${characterInfo.server}`);
    }
    
    if (characterInfo.spec) {
      charInfo.push(`spec=${characterInfo.spec}`);
    }
    
    return charInfo.join('\n');
  }

  // Validate character class/spec combination
  static validateCharacterInfo(characterInfo) {
    if (!characterInfo.class || !characterInfo.spec) {
      return {
        valid: false,
        error: 'Missing class or spec information'
      };
    }

    const classData = ConstraintValidator.getClassConstraints(characterInfo.class);
    if (!classData) {
      return {
        valid: false,
        error: `Unknown class: ${characterInfo.class}`
      };
    }

    const specData = ConstraintValidator.getSpecConstraints(characterInfo.class, characterInfo.spec);
    if (!specData) {
      return {
        valid: false,
        error: `Unknown spec: ${characterInfo.spec} for class: ${characterInfo.class}`
      };
    }

    return { valid: true };
  }
}

export default SimcParser;