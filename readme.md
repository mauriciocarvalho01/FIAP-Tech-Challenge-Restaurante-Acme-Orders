# FIAP - Software Architecture Pós Tech - 7SOAT

### Fase 4: Tech Challenge

#### Restaurante ACME

### Grupo

- <a href="https://linkedin.com/in/mauricio-carvalho-programmer" target="_blank"><img src="https://raw.githubusercontent.com/rahuldkjain/gthub-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="LinkedIn" width="20" height="20"/></a> [Mauricio Carvalho Pinheiro RM: rm356030](https://www.linkedin.com/in/mauricio-carvalho-developer)
- <a href="https://linkedin.com/in/geovanelourenco" target="_blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="LinkedIn" width="20" height="20"/></a> [Geovane Lourenço da Silva RM: 356061](https://www.linkedin.com/in/geovanelourenco)
- <a href="https://linkedin.com/in/marciocintrafilho" target="_blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="LinkedIn" width="20" height="20"/></a> [Márcio de Souza Cintra Filho RM: 355344](https://linkedin.com/in/marciocintrafilho)
- <a href="https://www.linkedin.com/in/arnoldosilva/" target="_blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="LinkedIn" width="20" height="20"/></a> [Antonio Arnoldo Lima da Silva RM: 356215](https://www.linkedin.com/in/arnoldosilva/)

<h3 align="left">Linguagens e Ferramentas:</h3>
<a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" alt="typescript" width="40" height="40"/> </a><a href="https://www.mysql.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original-wordmark.svg" alt="mysql" width="40" height="40"/> </a><a href="https://nodejs.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="nodejs" width="40" height="40"/> </a><a href="https://www.docker.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg" alt="docker" width="40" height="40"/> </a>
</a><a href="https://kubernetes.io/pt-br" target="_blank" rel="noreferrer"> <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0ZRaprpBOQN_FpQY_8ImbRvEtOY9UgLO6cg&s" alt="docker" width="40" height="40"/> </a>

<a href="https://miro.com/app/board/uXjVKTlyQEk=/?share_link_id=112660018954" target="_blank"><img src="https://images.ctfassets.net/w6r2i5d8q73s/49Gy23NRmO7BRuWS9ewuIk/c786ff574fe59f91b0a054ec531769b3/miro.png" alt="LinkedIn" width="20" height="20"/></a> [Diagrama Event Storm](https://miro.com/app/board/uXjVKTlyQEk=/?share_link_id=112660018954)
<br>
<a href="https://www.notion.so/Tech-Challenge-DDD-linguagem-Ub-qua-d24b857c89544d2aafc33852843f40bc?pvs=4" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" alt="LinkedIn" width="20" height="20"/></a> [Linguagem Ubíqua](https://www.notion.so/Tech-Challenge-DDD-linguagem-Ub-qua-d24b857c89544d2aafc33852843f40bc?pvs=4)

<h1>Clean Architecture (Arquitetura Limpa)</h1>
<p>A Clean Architecture é um padrão de arquitetura de software que visa a criar sistemas que são independentes de frameworks, testáveis, independentes de UI, independentes de banco de dados e independentes de qualquer agência externa. A estrutura lógica que foi desenvolvida no projeto pode ser explicada da seguinte forma:</p>

<div class="layer">
    <h2>Application Layer</h2>
    <ul>
        <li><strong>controllers</strong>: Contém os controladores que recebem as requisições dos usuários, interagem com os casos de uso e retornam as respostas apropriadas. Eles servem como intermediários entre a interface do usuário e a lógica de negócio.</li>
        <li><strong>helpers</strong>: Inclui funções auxiliares ou utilitárias usadas pelos controladores. Podem ser funções de formatação, manipulação de dados, etc.</li>
        <li><strong>middlewares</strong>: Contém middlewares que processam requisições antes de chegarem aos controladores ou depois que saem dos controladores, como autenticação, autorização, logging, etc.</li>
        <li><strong>validation</strong>: Abriga lógica de validação de dados. Pode conter validadores para entradas de usuário, esquemas de validação, etc.</li>
    </ul>
</div>
<div class="layer">
    <h2>Domain Layer</h2>
    <ul>
        <li><strong>contracts</strong>: Define interfaces e contratos que a camada de aplicação deve seguir. Inclui interfaces para repositórios, gateways, serviços, etc. Isso permite que a implementação concreta seja trocada sem afetar a lógica de negócio.</li>
        <li><strong>use-cases</strong>: Contém a lógica de negócio principal e os casos de uso do sistema. Cada caso de uso representa uma ação ou um conjunto de ações que o sistema deve realizar.</li>
    </ul>
</div>
<div class="layer">
    <h2>Infra Layer</h2>
    <ul>
        <li><strong>docs</strong>: Documentação da aplicação, que pode incluir especificações de API, manuais de usuário, etc.</li>
        <li><strong>gateways</strong>: Implementa os contratos definidos na camada de domínio para interagir com sistemas externos, como APIs, serviços de terceiros, etc.</li>
        <li><strong>helpers</strong>: Funções auxiliares específicas para a camada de infraestrutura.</li>
        <li><strong>repos/mysql</strong>: Contém implementações específicas de repositórios para o banco de dados MySQL. Implementa as interfaces definidas na camada de domínio.</li>
    </ul>
</div>
<div class="layer">
    <h2>Main Layer</h2>
    <ul>
        <li><strong>adapters</strong>: Inclui adaptadores que convertem dados de uma forma para outra, facilitando a comunicação entre diferentes partes do sistema ou entre o sistema e sistemas externos.</li>
        <li><strong>config</strong>: Contém configurações gerais da aplicação, como variáveis de ambiente, configurações de framework, etc.</li>
        <li><strong>docs</strong>: Documentação geral da aplicação, incluindo documentação de API, documentação de arquitetura, etc.</li>
        <li><strong>factories</strong>: Contém fábricas que instanciam objetos e dependências. Usado para implementar o padrão de injeção de dependência.</li>
        <li><strong>middlewares</strong>: Middlewares gerais da aplicação, que podem ser usados em diferentes pontos do sistema.</li>
        <li><strong>routes</strong>: Define as rotas de aplicação, mapeando endpoints para controladores e ações específicas..</li>
    </ul>
</div>
<p>Essa estrutura permite uma clara separação de responsabilidades e facilita a manutenção, testes e evolução do sistema. Cada camada tem um propósito específico e deve ser desenvolvida e testada de forma independente das outras.</p>

# Executar o Projeto Tech Challenge Minikube

Este guia fornece instruções passo a passo para configurar e executar o ambiente do projeto utilizando Kubermetes com Minikube.

## Pré-requisitos

Certifique-se de ter os seguintes softwares instalados na sua máquina:

- [Docker](https://www.docker.com/get-started)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Fwindows%2Fx86-64%2Fstable%2F.exe+download)
- [Kubectl](https://kubernetes.io/pt-br/docs/reference/kubectl/)

## Passo a Passo

### 1. Clone o Repositório

Clone este repositório para sua máquina local:

```sh
git clone https://github.com/mauriciocarvalho01/FIAP-Software-Architecture-Pos-Tech-7SOAT.git
cd FIAP-Software-Architecture-Pos-Tech-7SOAT
```

### 2. Instale o Minikube e Kubectl

Certifique-se de ter o Minikube e o Kubectl instalados em sua máquina. Siga as instruções de instalação no site oficial do Minikube.

### 3. Inicie o Minikube

Inicie o Minikube com o seguinte comando:

```sh
minikube start
minikube tunnel
```

### 4. Crie e Aplique os Arquivos Kubernetes

Crie e aplique os arquivos Kubernetes necessários (ConfigMap, Deployment, Service, HPA, etc.):

```sh
kubectl apply -f k8s/config-map.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

### 5. Documentos


- [Arquitetura Microserviços](public/architecture.png)

- [Docs Swagger](http://localhost/api-docs/)

- [Video Explicação da Arquitetura](https://1drv.ms/v/s!AmX5yCf3Zx_Qpspkl-BZVLKVXtW25w?e=hgjDPb)
