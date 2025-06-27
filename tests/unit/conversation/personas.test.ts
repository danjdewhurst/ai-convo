import { describe, it, expect, beforeEach } from 'vitest';
import { PersonaManager, DEFAULT_PERSONAS } from '../../../src/conversation/personas.js';
import type { PersonaConfig } from '../../../src/types/index.js';

describe('PersonaManager', () => {
  let personaManager: PersonaManager;

  beforeEach(() => {
    personaManager = new PersonaManager();
  });

  describe('constructor', () => {
    it('should initialize with default personas', () => {
      const allPersonas = personaManager.getAllPersonas();
      expect(allPersonas.length).toBeGreaterThan(0);
      
      // Check that default personas are loaded
      const alice = personaManager.getPersona('alice');
      expect(alice).toBeDefined();
      expect(alice?.name).toBe('Alice');
    });

    it('should initialize with custom personas', () => {
      const customPersonas = {
        custom1: {
          name: 'Custom One',
          personality: 'Test personality',
          speakingStyle: 'Test style',
          interests: ['test'],
        },
      };

      const customManager = new PersonaManager(customPersonas);
      const customPersona = customManager.getPersona('custom1');
      
      expect(customPersona).toBeDefined();
      expect(customPersona?.name).toBe('Custom One');
    });

    it('should merge custom personas with defaults', () => {
      const customPersonas = {
        custom1: {
          name: 'Custom One',
          personality: 'Test personality',
          speakingStyle: 'Test style',
          interests: ['test'],
        },
      };

      const customManager = new PersonaManager(customPersonas);
      
      // Should have both default and custom personas
      const alice = customManager.getPersona('alice');
      const custom = customManager.getPersona('custom1');
      
      expect(alice).toBeDefined();
      expect(custom).toBeDefined();
    });
  });

  describe('getPersona', () => {
    it('should return persona by key (case insensitive)', () => {
      const alice = personaManager.getPersona('alice');
      const aliceUpper = personaManager.getPersona('ALICE');
      
      expect(alice).toBeDefined();
      expect(aliceUpper).toBeDefined();
      expect(alice).toEqual(aliceUpper);
    });

    it('should return undefined for non-existent persona', () => {
      const nonExistent = personaManager.getPersona('nonexistent');
      expect(nonExistent).toBeUndefined();
    });

    it('should return correct persona data', () => {
      const alice = personaManager.getPersona('alice');
      
      expect(alice).toMatchObject({
        name: 'Alice',
        personality: expect.any(String),
        speakingStyle: expect.any(String),
        interests: expect.any(Array),
      });
    });
  });

  describe('getPersonaByName', () => {
    it('should return persona by display name (case insensitive)', () => {
      const alice = personaManager.getPersonaByName('Alice');
      const aliceLower = personaManager.getPersonaByName('alice');
      
      expect(alice).toBeDefined();
      expect(aliceLower).toBeDefined();
      expect(alice).toEqual(aliceLower);
    });

    it('should return undefined for non-existent display name', () => {
      const nonExistent = personaManager.getPersonaByName('Non Existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should return correct persona for valid display name', () => {
      const bob = personaManager.getPersonaByName('Bob');
      
      expect(bob).toBeDefined();
      expect(bob?.name).toBe('Bob');
    });
  });

  describe('getAllPersonas', () => {
    it('should return array of all personas', () => {
      const allPersonas = personaManager.getAllPersonas();
      
      expect(Array.isArray(allPersonas)).toBe(true);
      expect(allPersonas.length).toBeGreaterThan(0);
      
      // Each item should be a valid persona
      allPersonas.forEach(persona => {
        expect(persona).toMatchObject({
          name: expect.any(String),
          personality: expect.any(String),
          speakingStyle: expect.any(String),
          interests: expect.any(Array),
        });
      });
    });

    it('should return copies of personas (not references)', () => {
      const allPersonas = personaManager.getAllPersonas();
      const originalCount = allPersonas.length;
      
      // Modify the returned array
      allPersonas.push({
        name: 'Test',
        personality: 'Test',
        speakingStyle: 'Test',
        interests: ['test'],
      });
      
      // Original should be unchanged
      const newAllPersonas = personaManager.getAllPersonas();
      expect(newAllPersonas.length).toBe(originalCount);
    });
  });

  describe('getPersonaNames', () => {
    it('should return array of persona display names', () => {
      const names = personaManager.getPersonaNames();
      
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      
      // Should include known default persona names
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
    });

    it('should return unique names', () => {
      const names = personaManager.getPersonaNames();
      const uniqueNames = [...new Set(names)];
      
      expect(names.length).toBe(uniqueNames.length);
    });
  });

  describe('addPersona', () => {
    const testPersona: PersonaConfig = {
      name: 'Test Persona',
      personality: 'Test personality description',
      speakingStyle: 'Test speaking style',
      interests: ['testing', 'development'],
    };

    it('should add new persona successfully', () => {
      personaManager.addPersona('testpersona', testPersona);
      
      const retrieved = personaManager.getPersona('testpersona');
      expect(retrieved).toEqual(testPersona);
    });

    it('should add persona with case insensitive key', () => {
      personaManager.addPersona('TestPersona', testPersona);
      
      const retrieved = personaManager.getPersona('testpersona');
      expect(retrieved).toEqual(testPersona);
    });

    it('should replace existing persona if key exists', () => {
      const originalPersona = personaManager.getPersona('alice');
      expect(originalPersona).toBeDefined();
      
      personaManager.addPersona('alice', testPersona);
      
      const newPersona = personaManager.getPersona('alice');
      expect(newPersona).toEqual(testPersona);
      expect(newPersona).not.toEqual(originalPersona);
    });

    it('should increase total persona count', () => {
      const originalCount = personaManager.getAllPersonas().length;
      
      personaManager.addPersona('newpersona', testPersona);
      
      const newCount = personaManager.getAllPersonas().length;
      expect(newCount).toBe(originalCount + 1);
    });
  });

  describe('removePersona', () => {
    it('should remove existing persona and return true', () => {
      const result = personaManager.removePersona('alice');
      
      expect(result).toBe(true);
      expect(personaManager.getPersona('alice')).toBeUndefined();
    });

    it('should return false for non-existent persona', () => {
      const result = personaManager.removePersona('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should remove persona with case insensitive key', () => {
      const result = personaManager.removePersona('ALICE');
      
      expect(result).toBe(true);
      expect(personaManager.getPersona('alice')).toBeUndefined();
    });

    it('should decrease total persona count', () => {
      const originalCount = personaManager.getAllPersonas().length;
      
      personaManager.removePersona('alice');
      
      const newCount = personaManager.getAllPersonas().length;
      expect(newCount).toBe(originalCount - 1);
    });
  });

  describe('getRandomPersonaPair', () => {
    it('should return two different personas', () => {
      const [persona1, persona2] = personaManager.getRandomPersonaPair();
      
      expect(persona1).toBeDefined();
      expect(persona2).toBeDefined();
      expect(persona1).not.toEqual(persona2);
    });

    it('should return valid persona objects', () => {
      const [persona1, persona2] = personaManager.getRandomPersonaPair();
      
      [persona1, persona2].forEach(persona => {
        expect(persona).toMatchObject({
          name: expect.any(String),
          personality: expect.any(String),
          speakingStyle: expect.any(String),
          interests: expect.any(Array),
        });
      });
    });

    it('should throw error when fewer than 2 personas available', () => {
      // Create a manager with no personas by removing all defaults
      const emptyManager = new PersonaManager({});
      // Remove all default personas
      emptyManager.removePersona('alice');
      emptyManager.removePersona('bob');
      emptyManager.removePersona('charlie');
      emptyManager.removePersona('diana');
      
      expect(() => emptyManager.getRandomPersonaPair()).toThrow(
        'At least 2 personas are required for a conversation'
      );
    });

    it('should work with exactly 2 personas', () => {
      // Create manager and remove defaults to leave only 2 custom ones
      const twoPersonaManager = new PersonaManager({
        persona1: {
          name: 'Persona 1',
          personality: 'First persona',
          speakingStyle: 'Style 1',
          interests: ['test1'],
        },
        persona2: {
          name: 'Persona 2',
          personality: 'Second persona',
          speakingStyle: 'Style 2',
          interests: ['test2'],
        },
      });

      // Remove default personas to ensure only our 2 custom ones exist
      twoPersonaManager.removePersona('alice');
      twoPersonaManager.removePersona('bob');
      twoPersonaManager.removePersona('charlie');
      twoPersonaManager.removePersona('diana');

      const [persona1, persona2] = twoPersonaManager.getRandomPersonaPair();
      
      expect(persona1.name).not.toBe(persona2.name);
      expect([persona1.name, persona2.name].sort()).toEqual(['Persona 1', 'Persona 2']);
    });
  });

  describe('validatePersona', () => {
    it('should return empty array for valid persona', () => {
      const validPersona: PersonaConfig = {
        name: 'Valid Persona',
        personality: 'Valid personality',
        speakingStyle: 'Valid speaking style',
        interests: ['interest1', 'interest2'],
      };

      const errors = personaManager.validatePersona(validPersona);
      expect(errors).toEqual([]);
    });

    it('should return error for missing name', () => {
      const invalidPersona: PersonaConfig = {
        name: '',
        personality: 'Valid personality',
        speakingStyle: 'Valid speaking style',
        interests: ['interest1'],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toContain('Persona name is required');
    });

    it('should return error for missing personality', () => {
      const invalidPersona: PersonaConfig = {
        name: 'Valid Name',
        personality: '',
        speakingStyle: 'Valid speaking style',
        interests: ['interest1'],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toContain('Persona personality is required');
    });

    it('should return error for missing speaking style', () => {
      const invalidPersona: PersonaConfig = {
        name: 'Valid Name',
        personality: 'Valid personality',
        speakingStyle: '',
        interests: ['interest1'],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toContain('Persona speaking style is required');
    });

    it('should return error for empty interests array', () => {
      const invalidPersona: PersonaConfig = {
        name: 'Valid Name',
        personality: 'Valid personality',
        speakingStyle: 'Valid speaking style',
        interests: [],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toContain('Persona must have at least one interest');
    });

    it('should return error for invalid interests type', () => {
      const invalidPersona: any = {
        name: 'Valid Name',
        personality: 'Valid personality',
        speakingStyle: 'Valid speaking style',
        interests: 'not an array',
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toContain('Persona must have at least one interest');
    });

    it('should return multiple errors for invalid persona', () => {
      const invalidPersona: PersonaConfig = {
        name: '',
        personality: '',
        speakingStyle: '',
        interests: [],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Persona name is required');
      expect(errors).toContain('Persona personality is required');
      expect(errors).toContain('Persona speaking style is required');
      expect(errors).toContain('Persona must have at least one interest');
    });

    it('should handle whitespace-only fields', () => {
      const invalidPersona: PersonaConfig = {
        name: '   ',
        personality: '\t\n',
        speakingStyle: '  \r\n',
        interests: ['valid'],
      };

      const errors = personaManager.validatePersona(invalidPersona);
      expect(errors).toContain('Persona name is required');
      expect(errors).toContain('Persona personality is required');
      expect(errors).toContain('Persona speaking style is required');
    });
  });
});

describe('DEFAULT_PERSONAS', () => {
  it('should contain valid persona configurations', () => {
    const personaKeys = Object.keys(DEFAULT_PERSONAS);
    expect(personaKeys.length).toBeGreaterThan(0);

    personaKeys.forEach(key => {
      const persona = DEFAULT_PERSONAS[key];
      expect(persona).toMatchObject({
        name: expect.any(String),
        personality: expect.any(String),
        speakingStyle: expect.any(String),
        interests: expect.any(Array),
      });

      // Validate each persona
      const manager = new PersonaManager();
      const errors = manager.validatePersona(persona);
      expect(errors).toEqual([]);
    });
  });

  it('should include expected default personas', () => {
    const expectedPersonas = ['alice', 'bob', 'charlie', 'diana'];
    
    expectedPersonas.forEach(personaKey => {
      expect(DEFAULT_PERSONAS[personaKey]).toBeDefined();
    });
  });

  it('should have unique persona names', () => {
    const names = Object.values(DEFAULT_PERSONAS).map(p => p.name);
    const uniqueNames = [...new Set(names)];
    
    expect(names.length).toBe(uniqueNames.length);
  });

  it('should have system prompts for all personas', () => {
    Object.values(DEFAULT_PERSONAS).forEach(persona => {
      expect(persona.systemPrompt).toBeDefined();
      expect(typeof persona.systemPrompt).toBe('string');
      if (persona.systemPrompt) {
        expect(persona.systemPrompt.length).toBeGreaterThan(0);
      }
    });
  });

  it('should have meaningful interests for all personas', () => {
    Object.values(DEFAULT_PERSONAS).forEach(persona => {
      expect(persona.interests.length).toBeGreaterThan(0);
      persona.interests.forEach(interest => {
        expect(typeof interest).toBe('string');
        expect(interest.length).toBeGreaterThan(0);
      });
    });
  });
}); 