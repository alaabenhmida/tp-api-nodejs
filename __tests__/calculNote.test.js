const { additionner, isValidMoyenne, calculMention } = require('../utils/calculNote');

describe('additionner()', () => {

  test('2 + 3 = 5', () => {
    expect(additionner(2, 3)).toBe(5);
  });

  test('nombres négatifs', () => {
    expect(additionner(-1, 1)).toBe(0);
  });

  test('0.1 + 0.2 ≈ 0.3', () => {
    // toBe(0.3) échouerait à cause de IEEE 754
    // toBeCloseTo compare avec une précision de 2 décimales par défaut
    expect(additionner(0.1, 0.2)).toBeCloseTo(0.3);
  });

});

describe('isValidMoyenne()', () => {

  test('retourne true pour 10', () => {
    expect(isValidMoyenne(10)).toBe(true);
  });

  test('retourne true pour les valeurs limites 0 et 20', () => {
    expect(isValidMoyenne(0)).toBe(true);
    expect(isValidMoyenne(20)).toBe(true);
  });

  test('retourne false pour une valeur négative', () => {
    expect(isValidMoyenne(-1)).toBe(false);
  });

  test('retourne false pour une valeur supérieure à 20', () => {
    expect(isValidMoyenne(21)).toBe(false);
  });

  test('retourne false pour une chaîne de caractères', () => {
    expect(isValidMoyenne('abc')).toBe(false);
  });

  test('retourne false pour null et undefined', () => {
    expect(isValidMoyenne(null)).toBe(false);
    expect(isValidMoyenne(undefined)).toBe(false);
  });

});

describe('calculMention()', () => {

  test('18 → "Très Bien"', () => {
    expect(calculMention(18)).toBe('Très Bien');
  });

  test('14 → "Bien"', () => {
    expect(calculMention(14)).toBe('Bien');
  });

  test('10 → "Passable"', () => {
    expect(calculMention(10)).toBe('Passable');
  });

  test('5 → "Insuffisant"', () => {
    expect(calculMention(5)).toBe('Insuffisant');
  });

  test('valeur limite basse : 0 → "Insuffisant"', () => {
    expect(calculMention(0)).toBe('Insuffisant');
  });

  test('valeur limite haute : 20 → "Très Bien"', () => {
    expect(calculMention(20)).toBe('Très Bien');
  });

});

describe('calculMention() — validation', () => {

  test('lève une erreur si la moyenne est négative', () => {
    expect(() => calculMention(-1)).toThrow('La moyenne doit être comprise entre 0 et 20');
  });

  test('lève une erreur si la moyenne dépasse 20', () => {
    expect(() => calculMention(21)).toThrow('La moyenne doit être comprise entre 0 et 20');
  });

  test('lève une erreur si ce n\'est pas un nombre', () => {
    expect(() => calculMention('quinze')).toThrow('La moyenne doit être un nombre');
  });

});