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
        //
        // All quality stages run npm commands inside a node:22-alpine container.
        // The workspace is mounted at /workspace; --mount caches npm downloads in
        // a named Docker volume (jenkins-npm-cache) shared across builds on the
        // same agent — avoids re-downloading packages on every build run.
        //
        // dir('frontend') ensures all npm commands resolve against frontend/
        // (where package.json lives), not the root of the movie-finder checkout.
        // ====================================================================

        stage('Type-check') {
            agent any
            steps {
                dir('frontend') {
                    sh """
                        docker run --rm \
                            -v "\$(pwd)":/workspace \
                            --mount type=volume,source=jenkins-npm-cache,target=/root/.npm \
                            -w /workspace \
                            ${NODE_IMAGE} sh -c \
                            'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npm run typecheck'
                    """
                }
            }
        }

        stage('Lint') {
            agent any
            steps {
                dir('frontend') {
                    sh """
                        docker run --rm \
                            -v "\$(pwd)":/workspace \
                            --mount type=volume,source=jenkins-npm-cache,target=/root/.npm \
                            -w /workspace \
                            ${NODE_IMAGE} sh -c \
                            'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npm run lint && npm run format:check'
                    """
                }
            }
        }

        stage('Test') {
            agent any
            steps {
                dir('frontend') {
                    sh 'mkdir -p test-results'
                    sh """
                        docker run --rm \
                            -v "\$(pwd)":/workspace \
                            --mount type=volume,source=jenkins-npm-cache,target=/root/.npm \
                            -w /workspace \
                            -e VITEST_JUNIT_OUTPUT_FILE=test-results/frontend-results.xml \
                            ${NODE_IMAGE} sh -c \
                            'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npm run test:ci'
                    """
                }
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'frontend/test-results/frontend-results.xml'
                    recordCoverage(
                        tools: [
                            [parser: 'COBERTURA', pattern: 'frontend/coverage/cobertura-coverage.xml']
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
                dir('frontend') {
                    sh """
                        docker run --rm \
                            -v "\$(pwd)":/workspace \
                            --mount type=volume,source=jenkins-npm-cache,target=/root/.npm \
                            -w /workspace \
                            ${NODE_IMAGE} sh -c \
                            'npm install -g npm@11.8.0 --prefer-offline && npm ci --prefer-offline && npx ng build --configuration=production'
                    """
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
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

                // Build from frontend/ — that directory is the Docker build context.
                dir('frontend') {
                    sh """
                        docker build \
                            --cache-from ${ACR_SERVER}/${SERVICE_NAME}:latest \
                            -t ${SHA_TAG} \
                            .
                    """
                }
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
            post {
                always {
                    sh 'docker logout "${ACR_SERVER}" || true'
                    // Remove locally-built images after push to prevent Jenkins node storage bloat.
                    // Public base images (node:22-alpine, nginx:stable-alpine) are NOT removed —
                    // they remain cached on the Jenkins node for future builds.
                    sh "docker rmi ${SHA_TAG} || true"
                    script {
                        if (env.BRANCH_NAME == 'main') {
                            sh "docker rmi ${ACR_SERVER}/${SERVICE_NAME}:latest || true"
                        }
                        if (buildingTag()) {
                            sh "docker rmi ${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_TAG_NAME} || true"
                        }
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
            post {
                always {
                    sh 'az logout || true'
                }
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
