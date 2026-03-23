// =============================================================================
// movie-finder-frontend — Jenkins declarative pipeline
//
// Three pipeline modes, selected automatically by branch / tag context:
//
//  CONTRIBUTION  (feature branches, pull requests)
//    → Type-check only. Fast feedback loop (< 3 min).
//      Nothing is built or pushed.
//
//  INTEGRATION   (main branch)
//    → Type-check + production build + Docker image pushed to ACR.
//      Optional: deploy to Azure staging slot (DEPLOY_STAGING param).
//
//  RELEASE       (git tags matching v*)
//    → Same as integration, plus a semantically versioned Docker tag
//      and an optional production deployment (DEPLOY_PRODUCTION param).
//
// ── Required Jenkins credentials ────────────────────────────────────────────
//  acr-login-server   Secret text  — ACR hostname, e.g. myregistry.azurecr.io
//  acr-credentials    Username/Password — ACR service-principal
//                     USR = client-id, PSW = client-secret
//  azure-sp           Username/Password — Azure service-principal for az CLI
//                     USR = client-id, PSW = client-secret
//                     (set AZURE_TENANT_ID + AZURE_SUBSCRIPTION_ID below)
//
// ── Required Jenkins plugins ─────────────────────────────────────────────────
//  Docker Pipeline, Credentials Binding, Git
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
        SERVICE_NAME   = 'movie-finder-frontend'
        NODE_IMAGE     = 'node:20-alpine'
        DOCKER_IMAGE   = 'docker:24-dind'

        // Azure tenant and subscription — not secrets, safe as env vars.
        // Override per-environment in Jenkins global configuration if needed.
        AZURE_TENANT_ID       = 'your-tenant-id'
        AZURE_SUBSCRIPTION_ID = 'your-subscription-id'
        AZURE_RESOURCE_GROUP  = 'movie-finder-rg'
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
                sh 'npx tsc --noEmit'
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
                ACR_SERVER  = credentials('acr-login-server')
                AZURE_SP    = credentials('azure-sp')
                IMAGE_TAG   = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_COMMIT.take(8)}"
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
                        --name    movie-finder-frontend-staging \
                        --resource-group "${AZURE_RESOURCE_GROUP}" \
                        --image   "${IMAGE_TAG}"
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
                ACR_SERVER  = credentials('acr-login-server')
                AZURE_SP    = credentials('azure-sp')
                IMAGE_TAG   = "${ACR_SERVER}/${SERVICE_NAME}:${env.GIT_TAG_NAME}"
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
                        --name    movie-finder-frontend \
                        --resource-group "${AZURE_RESOURCE_GROUP}" \
                        --image   "${IMAGE_TAG}"
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
