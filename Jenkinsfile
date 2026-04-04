// =============================================================================
// movie-finder-frontend — Jenkins declarative pipeline
//
// Stages:
//   1. Checkout
//   2. Lint + Typecheck — frontend app
//   3. Test — frontend app (Vitest with coverage)
//   4. Build App Image
//   5. Deploy to Staging
//   6. Deploy to Production
//
// Required Jenkins credentials (see docs/devops/setup.md):
//   acr-login-server          Secret text        — ACR hostname
//   acr-credentials           Username/Password  — ACR service-principal
//   azure-sp                  Username/Password  — Azure SP (USR=client-id, PSW=secret)
//   azure-tenant-id           Secret text        — Azure tenant UUID
//   azure-sub-id              Secret text        — Azure subscription ID
//   aca-staging-rg            Secret text        — Staging Container App resource group
//   aca-frontend-staging-name Secret text        — Staging Container App name
//   aca-prod-rg               Secret text        — Production Container App resource group
//   aca-frontend-name         Secret text        — Production Container App name
//
// Required Jenkins plugins:
//   GitHub, Docker, JUnit, Coverage, Credentials Binding, Git
// =============================================================================

pipeline {
    agent none

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_STAGING',
            defaultValue: false,
            description: 'Force a staging deploy from any branch after a successful build.'
        )
    }

    environment {
        SERVICE_NAME = 'movie-finder-frontend'
    }

    stages {

        // ------------------------------------------------------------------ //
        stage('Checkout') {
            agent any
            steps {
                checkout scm
                // Stash the complete workspace so later stages can run on any
                // executor with the full repo checkout.
                stash name: 'source', excludes: '.git,**/.git,**/node_modules,**/dist,**/htmlcov,**/*.xml'
            }
        }

        // ------------------------------------------------------------------ //
        stage('Lint + Typecheck') {
            agent any
            options { skipDefaultCheckout() }
            steps {
                unstash 'source'
                dir('frontend') {
                    sh '''
                        export COMPOSE_PROJECT_NAME="movie-finder-frontend-ci-${env.BUILD_NUMBER}"
                        make init
                    '''
                    parallel(
                        'Lint': {
                            sh 'export COMPOSE_PROJECT_NAME="movie-finder-frontend-ci-${env.BUILD_NUMBER}" && make lint'
                        },
                        'Typecheck': {
                            sh 'export COMPOSE_PROJECT_NAME="movie-finder-frontend-ci-${env.BUILD_NUMBER}" && make typecheck'
                        }
                    )
                }
            }
            post {
                always {
                    dir('frontend') {
                        sh 'export COMPOSE_PROJECT_NAME="movie-finder-frontend-ci-${env.BUILD_NUMBER}" && make ci-down || true'
                    }
                }
            }
        }

        // ------------------------------------------------------------------ //
        stage('Test') {
            agent any
            options { skipDefaultCheckout() }
            steps {
                unstash 'source'
                dir('frontend') {
                    sh '''
                        export COMPOSE_PROJECT_NAME="movie-finder-frontend-ci-${env.BUILD_NUMBER}"
                        make init
                        make test-coverage
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/test-results/frontend-results.xml'
                    recordCoverage(
                        tools: [
                            [parser: 'COBERTURA', pattern: 'frontend/coverage/movie-finder-ui/cobertura-coverage.xml']
                        ],
                        id: 'coverage',
                        name: 'Frontend Coverage',
                        sourceCodeRetention: 'EVERY_BUILD',
                        failOnError: false,
                        qualityGates: [
                            [threshold: 10.0, metric: 'LINE', baseline: 'PROJECT', unstable: true],
                            [threshold: 10.0, metric: 'BRANCH', baseline: 'PROJECT', unstable: true]
                        ]
                    )
                    dir('frontend') {
                        sh 'export COMPOSE_PROJECT_NAME="movie-finder-frontend-ci-${env.BUILD_NUMBER}" && make ci-down || true'
                    }
                }
            }
        }

        // ------------------------------------------------------------------ //
        stage('Build App Image') {
            when {
                anyOf {
                    branch 'main'
                    buildingTag()
                    expression { params.DEPLOY_STAGING == true }
                }
            }
            agent any
            environment {
                ACR_SERVER = credentials('acr-login-server')
                ACR_CREDENTIALS = credentials('acr-credentials')
            }
            steps {
                script {
                    def tag = env.GIT_TAG_NAME ?: env.GIT_COMMIT.take(8)
                    env.BUILD_TAG  = tag
                    env.FULL_IMAGE = "${env.ACR_SERVER}/${env.SERVICE_NAME}:${tag}"
                }
                sh 'echo "$ACR_CREDENTIALS_PSW" | docker login "$ACR_SERVER" -u "$ACR_CREDENTIALS_USR" --password-stdin'
                sh "docker pull ${env.ACR_SERVER}/${env.SERVICE_NAME}:latest || true"
                // Build from frontend/ — that directory is the Docker build context.
                dir('frontend') {
                    sh """
                        docker build \
                            --cache-from ${env.ACR_SERVER}/${env.SERVICE_NAME}:latest \
                            -t ${env.FULL_IMAGE} \
                            .
                    """
                }
                sh "docker push ${env.FULL_IMAGE}"
                script {
                    if (env.BRANCH_NAME == 'main') {
                        def latestImage = "${env.ACR_SERVER}/${env.SERVICE_NAME}:latest"
                        sh "docker tag ${env.FULL_IMAGE} ${latestImage}"
                        sh "docker push ${latestImage}"
                    }
                }
            }
            post {
                always {
                    sh 'docker logout "$ACR_SERVER" || true'
                    sh "docker rmi ${env.FULL_IMAGE} || true"
                    script {
                        if (env.BRANCH_NAME == 'main') {
                            sh "docker rmi ${env.ACR_SERVER}/${env.SERVICE_NAME}:latest || true"
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------------------ //
        stage('Deploy to Staging') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.DEPLOY_STAGING == true }
                }
            }
            agent any
            environment {
                AZURE_SP        = credentials('azure-sp')
                AZURE_TENANT_ID = credentials('azure-tenant-id')
                AZURE_SUB_ID    = credentials('azure-sub-id')
                ACA_RG          = credentials('aca-staging-rg')
                ACA_NAME        = credentials('aca-frontend-staging-name')
                ACR_SERVER      = credentials('acr-login-server')
            }
            steps {
                sh '''
                    az login --service-principal \
                        --username "$AZURE_SP_USR" \
                        --password "$AZURE_SP_PSW" \
                        --tenant   "$AZURE_TENANT_ID"
                    az account set --subscription "$AZURE_SUB_ID"
                '''
                sh '''
                    az containerapp update \
                        --name           "$ACA_NAME" \
                        --resource-group "$ACA_RG" \
                        --image          "$ACR_SERVER/$SERVICE_NAME:$BUILD_TAG"
                    az containerapp revision list \
                        --name           "$ACA_NAME" \
                        --resource-group "$ACA_RG" \
                        --output         table
                '''
            }
            post {
                always {
                    sh 'az logout || true'
                }
            }
        }

        // ------------------------------------------------------------------ //
        stage('Deploy to Production') {
            when { buildingTag() }
            agent any
            environment {
                AZURE_SP        = credentials('azure-sp')
                AZURE_TENANT_ID = credentials('azure-tenant-id')
                AZURE_SUB_ID    = credentials('azure-sub-id')
                ACA_RG          = credentials('aca-prod-rg')
                ACA_NAME        = credentials('aca-frontend-name')
                ACR_SERVER      = credentials('acr-login-server')
            }
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    input message: "Deploy ${env.GIT_TAG_NAME} to PRODUCTION?",
                          ok: 'Deploy',
                          submitter: 'release-managers'
                }
                sh '''
                    az login --service-principal \
                        --username "$AZURE_SP_USR" \
                        --password "$AZURE_SP_PSW" \
                        --tenant   "$AZURE_TENANT_ID"
                    az account set --subscription "$AZURE_SUB_ID"
                '''
                sh '''
                    az containerapp update \
                        --name           "$ACA_NAME" \
                        --resource-group "$ACA_RG" \
                        --image          "$ACR_SERVER/$SERVICE_NAME:$BUILD_TAG"
                    az containerapp revision list \
                        --name           "$ACA_NAME" \
                        --resource-group "$ACA_RG" \
                        --output         table
                '''
            }
            post {
                always {
                    sh 'az logout || true'
                }
            }
        }

    }

    post {
        always {
            node('') {
                cleanWs()
            }
        }
        failure {
            echo "Pipeline failed on ${env.BRANCH_NAME ?: env.GIT_TAG_NAME ?: 'unknown ref'}."
        }
        success {
            script {
                if (buildingTag()) {
                    echo "Release ${env.GIT_TAG_NAME} (${env.BUILD_TAG}) built and pushed."
                } else if (env.BRANCH_NAME == 'main') {
                    echo "Build ${env.BUILD_TAG} pushed to ACR."
                }
            }
        }
    }
}
