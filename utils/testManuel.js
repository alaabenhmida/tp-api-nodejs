// utils/testManuel.js
const { additionner, isValidMoyenne, calculMention } = require('./calculNote');

let ok = 0, total = 0;

function check(description, obtenu, attendu) {
  total++;
  if (obtenu === attendu) {
    ok++;
    console.log(`  ✅ ${description}`);
  } else {
    console.log(`  ❌ ${description}`);
    console.log(`     Attendu : ${attendu}`);
    console.log(`     Obtenu  : ${obtenu}`);
  }
}

console.log('\n--- additionner() ---');
check('2 + 3 = 5',         additionner(2, 3),     5);
check('0 + 0 = 0',         additionner(0, 0),     0);
check('-1 + 1 = 0',        additionner(-1, 1),    0);
check('0.1 + 0.2 = 0.3',  additionner(0.1, 0.2), 0.3); // 👀

console.log('\n--- isValidMoyenne() ---');
check('10 est valide',         isValidMoyenne(10),       true);
check('0 est valide',          isValidMoyenne(0),        true);
check('20 est valide',         isValidMoyenne(20),       true);
check('-1 est invalide',       isValidMoyenne(-1),       false);
check('21 est invalide',       isValidMoyenne(21),       false);
check('"abc" est invalide',    isValidMoyenne('abc'),    false);

console.log('\n--- calculMention() ---');
check('18 → Très Bien',   calculMention(18), 'Très Bien');
check('14 → Bien',        calculMention(14), 'Bien');
check('10 → Passable',    calculMention(10), 'Passable');
check('5  → Insuffisant', calculMention(5),  'Insuffisant');

console.log(`\n${ok}/${total} tests réussis\n`);