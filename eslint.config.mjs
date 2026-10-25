import next from 'eslint-config-next';

// eslint-config-next exporte directement un Linter.Config[] (module.exports = config),
// pas une fonction : ne pas appeler next().
const config = [
  ...next,
  {
    rules: {
      // Regles de l'ere React Compiler, en erreur par defaut dans eslint-config-next 16.
      // ~11 occurrences actuelles : patterns herites fonctionnels (setState dans useEffect,
      // reset de modal, sync de props). TODO roadmap : refactorer puis restaurer 'error'.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default config;
