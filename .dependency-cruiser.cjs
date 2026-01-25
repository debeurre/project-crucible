module.exports = {
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    moduleSystems: ['es6', 'cjs', 'amd', 'tsd'],
    tsPreCompilationDeps: true, // Handle imports before compilation
  },
  forbidden: [
    {
      name: 'no-system-to-system-import',
      severity: 'error',
      comment: 'Systems should not import other Systems (ECS Purity). Particles and logic sub-modules are exceptions.',
      from: {
        path: '^src/systems/',
      },
      to: {
        path: '^src/systems/',
        pathNot: 'ISystem|ParticleSystem\\.ts|services/|render/|jobs/|steering/SteeringBehaviors\\.ts',
      },
    },
  ],
};
