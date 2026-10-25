import next from 'eslint-config-next';

// eslint-config-next exporte directement un Linter.Config[] (module.exports = config),
// pas une fonction : ne pas appeler next().
export default [...next];
