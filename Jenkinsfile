// =============================================================================
// movie-finder-frontend — Jenkins declarative pipeline
//
// Three pipeline modes, selected automatically by branch / tag context:
//
//  CONTRIBUTION  (feature branches, pull requests)
//    → Type-check + Lint + Test with coverage. Fast feedback loop (< 5 min).
//      Nothing is built or pushed.
//
//  INTEGRATION   (main branch)
//    → All CONTRIBUTION checks + production build + Docker image pushed to ACR.
//      Optional: deploy to Azure staging slot (DEPLOY_STAGING param).
//
//  RELEASE       (git tags matching v*)
//    → Same as integration, plus a semantically versioned Docker tag
//      and an optional production deployment (DEPLOY_PRODUCTION param).
//
// ── Required Jenkins credentials ────────────────────────────────────────────
//  acr-login-server          Secret text        — ACR hostname
//  acr-credentials           Username/Password  — ACR service-principal
//  azure-sp                  Username/Password  — Azure SP (USR=client-id, PSW=secret)
//  azure-tenant-id           Secret text        — Azure tenant UUID
//  aca-rg                    Secret text        — Container Apps resource group
//  aca-frontend-staging-name Secret text        — Staging Container App name
//  aca-frontend-name         Secret text        — Production Container App name
//
// ── Required Jenkins plugins ─────────────────────────────────────────────────
//  Docker Pipeline, Credentials Binding, Git, Coverage (or Cobertura), JUnit
//
// ── GitHub Webhook ───────────────────────────────────────────────────────────
//  Payload URL : https://<jenkins>/github-webhook/
//  Content type: application/json
//  Events      : Push, Pull request
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
            description: '[INTEGRATION] Deploy image to Azure staging slot after build.'
        )
        booleanParam(
            name: 'DEPLOY_PRODUCTION',
            defaultValue: false,
            description: '[RELEASE] Promote tagged image to the production slot.'
        )
    }

    environment {
        SERVICE_NAME = 'movie-finder-frontend'
        NODE_IMAGE   = 'node:20-alpine'
        DOCKER_IMAGE = 'docker:24-dind'
    }

    stages {

        // ====================================================================
        // CONTRIBUTION — runs on every branch and PR
        // ====================================================================

        stage('Type-check') {
            agent {
                docker { image "${NODE_IMAGE}" }
            }
            steps {
                sh 'npm ci --prefer-offline'
                sh 'npm run typecheck'
            }
        }

        stage('Lint') {
            agent {
                docker { image "${NODE_IMAGE}" }
            }
            steps {
                sh 'npm ci --prefer-offline'
                sh 'npm run lint'
                sh 'npm run format:check'
            }
        }

        stage('Test') {
            agent {
                docker { image "${NODE_IMAGE}" }
            }
            environment {
                // Vitest JUnit XML — consumed by Jenkins JUnit plugin
                VITEST_JUNIT_OUTPUT_FILE = 'test-results/frontend-results.xml'
            }
            steps {
                sh 'npm ci --prefer-offline'
                sh 'mkdir -p test-results'
                sh 'npm run test:ci'
            }
            post {
                always {
                    // Publish JUnit test results
                    junit allowEmptyResults: true,
                          testResults: 'test-results/frontend-results.xml'
                    // Publish LCOV / Cobertura coverage
                    recordCoverage(
                        tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']],
                        id: 'frontend-coverage',
                        name: 'Frontend Coverage'
                    )
                }
            }
        }

        // ====================================================================
        // INTEGRATION + RELEASE — skipped on feature branches / PRs
        // ====================================================================

        stage('Production build') {
            when {
                anyOf { branch 'main'; buildingTag() }
            }
            agent {
                docker { image "${NODE_IMAGE}" }
            }
            steps {
                sh 'npm ci --prefer-offline'
                sh 'npx ng build --configuration=production'
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**', fingerprint: true
                }
            }
        }

        stage('Push image to ACR') {
            when {
                anyOf { branch 'main'; buildingTag() }
            }
            agent {
                docker {
                    image "${DOCKER_IMAGE}"
                    args  '--privileged -v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            environment {
                ACR_SERVER      = credentials('acr-login-server')
                ACR_CREDENTIALS = credentials('acr-credentials')
                // Commit-SHA tag — used as the canonical immutable reference.
                SHA_TAG = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_COMMIT.take(8)}"
            }
            steps {
                sh '''
                    echo "${ACR_CREDENTIALS_PSW}" | \
                        docker login "${ACR_SERVER}" \
                            --username "${ACR_CREDENTIALS_USR}" \
                            --password-stdin
                '''

                // Build with layer cache reuse from the last :latest push.
                sh """
                    docker build \
                        --cache-from ${ACR_SERVER}/${SERVICE_NAME}:latest \
                        -t ${SHA_TAG} \
                        frontend/
                """
                sh "docker push ${SHA_TAG}"

                script {
                    // main → also tag :latest
                    if (env.BRANCH_NAME == 'main') {
                        sh "docker tag  ${SHA_TAG} ${ACR_SERVER}/${SERVICE_NAME}:latest"
                        sh "docker push ${ACR_SERVER}/${SERVICE_NAME}:latest"
                    }
                    // tag build → also push the semver tag (e.g. :v1.2.3)
                    if (buildingTag()) {
                        def semver = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_TAG_NAME}"
                        sh "docker tag  ${SHA_TAG} ${semver}"
                        sh "docker push ${semver}"
                    }
                }
            }
        }

        // ====================================================================
        // STAGING DEPLOY — main branch, manual opt-in
        // ====================================================================

        stage('Deploy to staging') {
            when {
                allOf {
                    branch 'main'
                    expression { params.DEPLOY_STAGING == true }
                }
            }
            agent { label 'deploy' }
            environment {
                ACR_SERVER      = credentials('acr-login-server')
                AZURE_SP        = credentials('azure-sp')
                AZURE_TENANT_ID = credentials('azure-tenant-id')
                ACA_RG          = credentials('aca-rg')
                ACA_APP_NAME    = credentials('aca-frontend-staging-name')
                IMAGE_TAG       = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_COMMIT.take(8)}"
            }
            steps {
                sh '''
                    az login --service-principal \
                        --username "${AZURE_SP_USR}" \
                        --password "${AZURE_SP_PSW}" \
                        --tenant  "${AZURE_TENANT_ID}"
                '''
                sh '''
                    az containerapp update \
                        --name           "${ACA_APP_NAME}" \
                        --resource-group "${ACA_RG}" \
                        --image          "${IMAGE_TAG}"
                '''
            }
        }

        // ====================================================================
        // PRODUCTION DEPLOY — tagged releases, manual opt-in
        // ====================================================================

        stage('Deploy to production') {
            when {
                allOf {
                    buildingTag()
                    expression { params.DEPLOY_PRODUCTION == true }
                }
            }
            agent { label 'deploy' }
            environment {
                ACR_SERVER      = credentials('acr-login-server')
                AZURE_SP        = credentials('azure-sp')
                AZURE_TENANT_ID = credentials('azure-tenant-id')
                ACA_RG          = credentials('aca-rg')
                ACA_APP_NAME    = credentials('aca-frontend-name')
                IMAGE_TAG       = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_TAG_NAME}"
            }
            steps {
                sh '''
                    az login --service-principal \
                        --username "${AZURE_SP_USR}" \
                        --password "${AZURE_SP_PSW}" \
                        --tenant  "${AZURE_TENANT_ID}"
                '''
                sh '''
                    az containerapp update \
                        --name           "${ACA_APP_NAME}" \
                        --resource-group "${ACA_RG}" \
                        --image          "${IMAGE_TAG}"
                '''
            }
        }

    }

    post {
        always {
            cleanWs()
        }
        failure {
            echo "Pipeline failed — branch: ${env.BRANCH_NAME ?: 'tag'}, stage: ${env.STAGE_NAME}."
        }
        success {
            script {
                if (buildingTag()) {
                    echo "Release ${env.GIT_TAG_NAME} built and pushed."
                }
            }
        }
    }
}
