// =============================================================================
// movie-finder-frontend — Jenkins declarative pipeline (Standalone)
//
// Stages:
//   1. Initialize — Build dev image
//   2. Quality — Lint + Typecheck (Parallel)
//   3. Test — Vitest with coverage
//   4. Build App Image — Push to ACR
//   5. Deploy to Staging — Azure Container App
//   6. Deploy to Production — Azure Container App (Manual Approval)
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
    agent any

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

        // ------------------------------------------------------------------ //
        stage('Build App Image') {
            when {
                anyOf {
                    branch 'main'
                    buildingTag()
                    expression { params.DEPLOY_STAGING == true }
                }
            }
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
                sh """
                    docker build \
                        --cache-from ${env.ACR_SERVER}/${env.SERVICE_NAME}:latest \
                        -t ${env.FULL_IMAGE} \
                        .
                """
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
            sh 'make clean || true'
            sh 'make ci-down || true'
            cleanWs()
        }
        failure {
            echo "Pipeline failed on ${env.BRANCH_NAME ?: env.GIT_TAG_NAME ?: 'unknown ref'}."
        }
        success {
            script {
                if (buildingTag()) {
                    echo "Release ${env.GIT_TAG_NAME} (${env.BUILD_TAG}) built and pushed."
                } else if (env.BRANCH_NAME == 'main') {
                    echo "Build ${env.BUILD_TAG} pushed to ACR and deployed to staging."
                } else {
                    echo "Frontend CI passed for ${env.BRANCH_NAME}."
                }
            }
        }
    }
}
