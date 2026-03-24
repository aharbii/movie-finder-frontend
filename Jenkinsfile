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
//  Credentials Binding, Git, JUnit
//  Note: docker run is used directly in steps — Docker Pipeline plugin not needed.
//  Note: stages use "agent any" — schedules on the built-in controller or any connected agent.
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
        NODE_IMAGE   = 'node:22-alpine'
    }

    stages {

        // ====================================================================
        // CONTRIBUTION — runs on every branch and PR
        // ====================================================================

        stage('Type-check') {
            agent any
            steps {
                sh """
                    docker run --rm \
                        -v "\$(pwd)":/workspace \
                        -w /workspace \
                        ${NODE_IMAGE} sh -c \
                        'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npm run typecheck'
                """
            }
        }

        stage('Lint') {
            agent any
            steps {
                sh """
                    docker run --rm \
                        -v "\$(pwd)":/workspace \
                        -w /workspace \
                        ${NODE_IMAGE} sh -c \
                        'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npm run lint && npm run format:check'
                """
            }
        }

        stage('Test') {
            agent any
            steps {
                sh 'mkdir -p test-results'
                sh """
                    docker run --rm \
                        -v "\$(pwd)":/workspace \
                        -w /workspace \
                        -e VITEST_JUNIT_OUTPUT_FILE=test-results/frontend-results.xml \
                        ${NODE_IMAGE} sh -c \
                        'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npm run test:ci'
                """
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'test-results/frontend-results.xml'
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
            agent any
            steps {
                sh """
                    docker run --rm \
                        -v "\$(pwd)":/workspace \
                        -w /workspace \
                        ${NODE_IMAGE} sh -c \
                        'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npx ng build --configuration=production'
                """
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
            agent any
            environment {
                ACR_SERVER      = credentials('acr-login-server')
                ACR_CREDENTIALS = credentials('acr-credentials')
                SHA_TAG         = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_COMMIT.take(8)}"
            }
            steps {
                sh '''
                    echo "${ACR_CREDENTIALS_PSW}" | \
                        docker login "${ACR_SERVER}" \
                            --username "${ACR_CREDENTIALS_USR}" \
                            --password-stdin
                '''

                sh """
                    docker build \
                        --cache-from ${ACR_SERVER}/${SERVICE_NAME}:latest \
                        -t ${SHA_TAG} \
                        .
                """
                sh "docker push ${SHA_TAG}"

                script {
                    if (env.BRANCH_NAME == 'main') {
                        sh "docker tag  ${SHA_TAG} ${ACR_SERVER}/${SERVICE_NAME}:latest"
                        sh "docker push ${ACR_SERVER}/${SERVICE_NAME}:latest"
                    }
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
            agent any
            environment {
                ACR_SERVER      = credentials('acr-login-server')
                AZURE_SP        = credentials('azure-sp')
                AZURE_TENANT_ID = credentials('azure-tenant-id')
                ACA_RG          = credentials('aca-staging-rg')
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
            agent any
            environment {
                ACR_SERVER      = credentials('acr-login-server')
                AZURE_SP        = credentials('azure-sp')
                AZURE_TENANT_ID = credentials('azure-tenant-id')
                ACA_RG          = credentials('aca-prod-rg')
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
            node('') {
                cleanWs()
            }
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
