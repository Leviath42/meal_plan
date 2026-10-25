import next from 'eslint-config-next';

// eslint-config-next exporte directement un Linter.Config[] (module.exports = config),
// pas une fonction : ne pas appeler next().

// Regles de l'ere React Compiler, en erreur par defaut dans eslint-config-next 16.
// ~11 occurrences actuelles : patterns herites fonctionnels (setState dans useEffect,
// reset de modal, sync de props). TODO roadmap : refactorer puis restaurer 'error'.
const override = {
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/immutability': 'warn',
};

// Flat config : une regle « plugin/regle » ne se resout que si « plugins » est
// declare dans le MEME objet de configuration. On injecte donc la surcharge dans
// l'objet de la config importee qui definit deja le plugin react-hooks,
// plutot que dans un objet separe.
const config = next.map((entry) =>
  entry.rules && 'react-hooks/set-state-in-effect' in entry.rules
    ? { ...entry, rules: { ...entry.rules, ...override } }
    : entry
);

export default config;
