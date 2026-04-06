// =============================================================================
// movie-finder-frontend — Jenkins declarative pipeline
//
// Stages:
//   1. Initialize — Build dev image
//   2. Lint + Typecheck (Parallel)
//   3. Test — Vitest with coverage
//
// Image build and ACR push are NOT in this pipeline.
// They are handled by the root aharbii/movie-finder Jenkinsfile after this
// pipeline signals success, keeping build credentials out of submodule jobs.
//
// Required Jenkins plugins:
//   GitHub, Docker, JUnit, Coverage, Credentials Binding, Git
// =============================================================================

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
    }

    environment {
        // Isolate compose project per build so parallel CI runs don't collide.
        COMPOSE_PROJECT_NAME = "movie-finder-frontend-ci-${env.BUILD_NUMBER}"
    }

    stages {

        // ------------------------------------------------------------------ //
        stage('Initialize') {
            steps {
                sh 'make init'
            }
        }

        // ------------------------------------------------------------------ //
        stage('Lint + Typecheck') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'make lint'
                    }
                }
                stage('Typecheck') {
                    steps {
                        sh 'make typecheck'
                    }
                }
            }
        }

        // ------------------------------------------------------------------ //
        stage('Test') {
            steps {
                sh 'make test-coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'test-results/frontend-results.xml'
                    recordCoverage(
                        tools: [
                            [parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']
                        ],
                        id: 'coverage',
                        name: 'Frontend Coverage',
                        sourceCodeRetention: 'EVERY_BUILD',
                        failOnError: false,
                        qualityGates: [
                            [threshold: 10.0, metric: 'LINE', baseline: 'PROJECT', status: 'UNSTABLE'],
                            [threshold: 10.0, metric: 'BRANCH', baseline: 'PROJECT', status: 'UNSTABLE']
                        ]
                    )
                }
            }
        }

    }

    post {
        always {
            sh 'make clean || true'
            sh 'make ci-down || true'
            cleanWs()
        }
        failure {
            echo "Pipeline failed on ${env.BRANCH_NAME ?: env.GIT_TAG_NAME ?: 'unknown ref'}."
        }
        success {
            echo "Frontend CI passed for ${env.BRANCH_NAME ?: env.GIT_TAG_NAME ?: 'unknown ref'}."
        }
    }
}
