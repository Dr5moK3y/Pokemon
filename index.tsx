
// --- TYPE DEFINITIONS ---
interface Move {
    name: string;
    power: number;
    type: string;
}

interface Pokemon {
    id: number;
    name: string;
    sprite: string;
    smallSprite: string;
    types: string[];
    stats: { name: string; value: number }[];
    maxHP: number;
    currentHP: number;
    moves: Move[];
    isFainted: boolean;
}

interface GameState {
    mode: 'single' | 'league' | 'team' | null;
    category: string | null;
    playerTeam: Pokemon[];
    botTeam: Pokemon[];
    activePlayerPokemonIndex: number;
    activeBotPokemonIndex: number;
    leagueProgress: { wins: number; total: number };
    isBattleOver: boolean;
    turn: 'player' | 'bot' | 'processing';
}

interface PokemonDisplayElements {
    name: HTMLElement;
    img: HTMLImageElement;
    types: HTMLElement;
    hp: HTMLElement;
    maxHP: HTMLElement;
    hpBar: HTMLElement;
    container: HTMLElement;
}


// --- CONSTANTS ---
const BASE_URL = 'https://pokeapi.co/api/v2/';
const MOVES_COUNT = 6;
const LEAGUE_CHALLENGES = 5;
const TEAM_SIZE = 5;
const POKEMON_PAGE_SIZE = 20;
const CATEGORY_MAP: Record<string, number[]> = {
    normal: [1,4,7,10,13,16,19,21,23,25,27,29,32,35,37,39,41,43,46,48,50,52,54,56,58,60,63,66,69,72,74,77,79,81,83,86,88,90,92,95,98,100,102,104,106,108,109,111,113,114,115,116,118,120,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143],
    rare: [2,3,5,6,8,9,11,12,14,15,17,18,26,28,31,34,36,38,40,42,45,47,49,51,53,55,57,59,62,65,68,71,73,76,78,80,82,85,87,89,91,94,97,99,101,105,110,112,117,119,121],
    legendary: [144,145,146,150,243,244,245,249,250,377,378,379,380,381,382,383,384,483,484,487,638,639,640,641,642,643,644,646],
    mythical: [151,251,385,386,490,491,492,493,494,647,648,649,720,721,800,801,802,807,808,809,891,892,893]
};
const TYPE_CHART: Record<string, Record<string, number>> = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 }, fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 }, water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 }, electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 }, grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 }, ice: { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5, fire: 0.5 }, fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 }, poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 }, ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 }, flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 }, psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0 }, bug: { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 }, rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 }, ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 }, dragon: { dragon: 2, steel: 0.5, fairy: 0 }, dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 }, steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 }, fairy: { fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5, bug: 0.5 }
};

// --- GAME STATE ---
let gameState: GameState;
let selectedPokemonForTeam: number[] = [];
let allCategoryPokemonIds: number[] = [];
let currentPokemonOffset = 0;

// --- DOM CACHING ---
const screens = {
    mode: document.getElementById('modeScreen')!,
    category: document.getElementById('categoryScreen')!,
    pokemon: document.getElementById('pokemonScreen')!,
    battle: document.getElementById('battleScreen')!,
    result: document.getElementById('resultScreen')!,
};

const DOMElements = {
    pokemonGrid: document.getElementById('pokemonGrid')!,
    startBattleBtn: document.getElementById('startBattleBtn') as HTMLButtonElement,
    currentCategory: document.getElementById('currentCategory')!,
    selectionTitle: document.getElementById('selectionTitle')!,
    selectionSubtitle: document.getElementById('selectionSubtitle')!,
    pokemonSearch: document.getElementById('pokemonSearch') as HTMLInputElement,
    teamPreview: document.getElementById('teamPreview')!,
    teamPreviewList: document.getElementById('teamPreviewList')!,
    loadMoreContainer: document.getElementById('loadMoreContainer')!,
    loadMoreBtn: document.getElementById('loadMoreBtn')!,
    preloader: document.getElementById('preloader')!,
    battleArena: document.getElementById('battleArena')!,
    battleLog: document.getElementById('battleLog')!,
    battleTitle: document.getElementById('battleTitle')!,
    battleSubtitle: document.getElementById('battleSubtitle')!,
    player: {
        name: document.getElementById('playerName')!,
        img: document.getElementById('playerPokemonImg') as HTMLImageElement,
        types: document.getElementById('playerTypes')!,
        hp: document.getElementById('playerHP')!,
        maxHP: document.getElementById('playerMaxHP')!,
        hpBar: document.getElementById('playerHPBar')!,
        movesContainer: document.getElementById('playerMovesContainer')!,
        teamRoster: document.getElementById('playerTeamRoster')!,
        container: document.querySelector('.pokemon-container.player .pokemon-active')! as HTMLElement,
    },
    bot: {
        name: document.getElementById('botName')!,
        img: document.getElementById('botPokemonImg') as HTMLImageElement,
        types: document.getElementById('botTypes')!,
        hp: document.getElementById('botHP')!,
        maxHP: document.getElementById('botMaxHP')!,
        hpBar: document.getElementById('botHPBar')!,
        movesGrid: document.getElementById('botMovesGrid')!,
        teamRoster: document.getElementById('botTeamRoster')!,
        container: document.querySelector('.pokemon-container.bot .pokemon-active')! as HTMLElement,
    },
    switchBtn: document.getElementById('switchBtn') as HTMLButtonElement,
    endBattleBtn: document.getElementById('endBattleBtn') as HTMLButtonElement,
    resultTitle: document.getElementById('resultTitle')!,
    resultMessage: document.getElementById('resultMessage')!,
    resultImageContainer: document.getElementById('resultImageContainer')!,
    rematchBtn: document.getElementById('rematchBtn') as HTMLButtonElement,
    goToHomeBtn: document.getElementById('goToHomeBtn') as HTMLButtonElement,
    typeChartCanvas: document.getElementById('typeChartCanvas')!,
    chartContent: document.getElementById('chartContent')!,
    switchModal: document.getElementById('switchModal')!,
    switchModalGrid: document.getElementById('switchModalGrid')!,
    leagueTransitionOverlay: document.getElementById('leagueTransitionOverlay')!,
    leagueTransitionText: document.getElementById('leagueTransitionText')!,
};

// --- INITIALIZATION ---
function initialize() {
    resetGameState();
    setupEventListeners();
    buildTypeChart();
    navigateToScreen('mode');
}

function resetGameState() {
    gameState = {
        mode: null,
        category: null,
        playerTeam: [],
        botTeam: [],
        activePlayerPokemonIndex: 0,
        activeBotPokemonIndex: 0,
        leagueProgress: { wins: 0, total: LEAGUE_CHALLENGES },
        isBattleOver: false,
        turn: 'player',
    };
    selectedPokemonForTeam = [];
    allCategoryPokemonIds = [];
    currentPokemonOffset = 0;
}

// --- NAVIGATION ---
function navigateToScreen(screenName: keyof typeof screens) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    document.getElementById('selectSingleBattle')!.addEventListener('click', () => selectMode('single'));
    document.getElementById('selectLeagueChallenge')!.addEventListener('click', () => selectMode('league'));
    document.getElementById('selectTeamBattle')!.addEventListener('click', () => selectMode('team'));

    document.querySelectorAll('.category').forEach(c => {
        c.addEventListener('click', () => selectCategory((c as HTMLElement).dataset.category!));
    });

    document.querySelectorAll('.back-button').forEach(btn => {
        const target = (btn as HTMLElement).dataset.target as keyof typeof screens;
        if (target) {
            btn.addEventListener('click', () => {
                if (target === 'mode') resetGameState();
                navigateToScreen(target);
            });
        }
    });

    DOMElements.startBattleBtn.addEventListener('click', startBattle);
    DOMElements.endBattleBtn.addEventListener('click', endBattle);
    DOMElements.rematchBtn.addEventListener('click', rematch);
    DOMElements.goToHomeBtn.addEventListener('click', endBattle);
    DOMElements.pokemonSearch.addEventListener('input', filterPokemon);
    DOMElements.loadMoreBtn.addEventListener('click', loadMorePokemon);

    DOMElements.switchBtn.addEventListener('click', () => showSwitchModal());
    document.getElementById('closeSwitchModalBtn')!.addEventListener('click', () => DOMElements.switchModal.classList.remove('active'));

    document.getElementById('toggleTypeChartBtn')!.addEventListener('click', toggleTypeChart);
    document.getElementById('closeChartBtn')!.addEventListener('click', toggleTypeChart);
}

// --- GAME SETUP FLOW ---
function selectMode(mode: 'single' | 'league' | 'team') {
    gameState.mode = mode;
    navigateToScreen('category');
}

function selectCategory(category: string) {
    gameState.category = category;
    DOMElements.currentCategory.textContent = category;
    
    const teamSize = gameState.mode === 'team' ? TEAM_SIZE : 1;
    DOMElements.selectionTitle.textContent = gameState.mode === 'team' ? 'Assemble Your Team' : 'Choose Your Pokémon';
    DOMElements.selectionSubtitle.textContent = `Select ${teamSize} Pokémon from the ${category} category`;
    DOMElements.teamPreview.style.display = gameState.mode === 'team' ? 'block' : 'none';
    
    navigateToScreen('pokemon');
    
    allCategoryPokemonIds = CATEGORY_MAP[category];
    currentPokemonOffset = 0;
    DOMElements.pokemonGrid.innerHTML = '';
    loadPokemonForSelection();
}

async function loadPokemonForSelection() {
    DOMElements.pokemonGrid.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Loading Pokémon...</p></div>`;
    DOMElements.startBattleBtn.disabled = true;
    selectedPokemonForTeam = [];
    updateTeamPreview();

    await loadMorePokemon();
}

async function loadMorePokemon() {
    const loader = DOMElements.pokemonGrid.querySelector('.loading');
    if (loader) loader.remove();

    const idsToLoad = allCategoryPokemonIds.slice(currentPokemonOffset, currentPokemonOffset + POKEMON_PAGE_SIZE);
    if (idsToLoad.length === 0) {
        DOMElements.loadMoreContainer.style.display = 'none';
        return;
    }
    
    const pokemonData = await Promise.all(
        idsToLoad.map(id => fetch(`${BASE_URL}pokemon/${id}`).then(res => res.json()))
    );

    pokemonData.forEach(p => {
        const card = createPokemonSelectionCard(p);
        DOMElements.pokemonGrid.appendChild(card);
    });

    currentPokemonOffset += POKEMON_PAGE_SIZE;
    if (currentPokemonOffset >= allCategoryPokemonIds.length) {
        DOMElements.loadMoreContainer.style.display = 'none';
    } else {
        DOMElements.loadMoreContainer.style.display = 'block';
    }
}

function createPokemonSelectionCard(pokemonData: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.id = pokemonData.id;
    card.innerHTML = `
        <div class="pokemon-id">#${pokemonData.id}</div>
        <img src="${pokemonData.sprites.other['official-artwork']?.front_default || pokemonData.sprites.front_default}" alt="${pokemonData.name}">
        <h3>${pokemonData.name}</h3>
        <div class="pokemon-types">${renderTypes(pokemonData.types.map((t: any) => t.type.name))}</div>`;
    
    card.addEventListener('click', () => handlePokemonSelection(card, pokemonData.id));
    return card;
}

function handlePokemonSelection(card: HTMLElement, id: number) {
    if (gameState.mode === 'team') {
        const index = selectedPokemonForTeam.indexOf(id);
        if (index > -1) {
            selectedPokemonForTeam.splice(index, 1);
            card.classList.remove('selected');
        } else {
            if (selectedPokemonForTeam.length < TEAM_SIZE) {
                selectedPokemonForTeam.push(id);
                card.classList.add('selected');
            }
        }
        DOMElements.startBattleBtn.disabled = selectedPokemonForTeam.length !== TEAM_SIZE;
        updateTeamPreview();
    } else {
        document.querySelectorAll('.pokemon-card.selected').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedPokemonForTeam = [id];
        DOMElements.startBattleBtn.disabled = false;
    }
}

function updateTeamPreview() {
    DOMElements.teamPreviewList.innerHTML = '';
    for (let i = 0; i < TEAM_SIZE; i++) {
        const id = selectedPokemonForTeam[i];
        const slot = document.createElement('div');
        slot.className = 'team-preview-slot';
        if (id) {
            const pokemonCard = DOMElements.pokemonGrid.querySelector(`.pokemon-card[data-id="${id}"]`);
            if (pokemonCard) {
                const name = pokemonCard.querySelector('h3')!.textContent;
                const img = pokemonCard.querySelector('img')!.src;
                slot.innerHTML = `<img src="${img}" alt="${name}"><span>${name}</span>`;
            }
        } else {
            slot.innerHTML = `<span>Empty</span>`;
        }
        DOMElements.teamPreviewList.appendChild(slot);
    }
}

function filterPokemon() {
    const searchTerm = DOMElements.pokemonSearch.value.toLowerCase();
    document.querySelectorAll('.pokemon-card').forEach(card => {
        const name = card.querySelector('h3')!.textContent!.toLowerCase();
        const id = card.querySelector('.pokemon-id')!.textContent!;
        (card as HTMLElement).style.display = (name.includes(searchTerm) || id.includes(searchTerm)) ? 'block' : 'none';
    });
}

// --- BATTLE ---
async function startBattle() {
    navigateToScreen('battle');
    DOMElements.preloader.style.display = 'flex';
    DOMElements.battleArena.classList.remove('visible');
    DOMElements.battleLog.innerHTML = '';
    
    const playerIds = selectedPokemonForTeam;
    const botIds = generateBotTeamIds(playerIds);

    gameState.playerTeam = await Promise.all(playerIds.map(createPokemonFromId));
    gameState.botTeam = await Promise.all(botIds.map(createPokemonFromId));
    
    gameState.activePlayerPokemonIndex = 0;
    gameState.activeBotPokemonIndex = 0;
    gameState.isBattleOver = false;

    setupBattleScreen();
    logToBattle(`The battle is about to begin!`);
    
    if (gameState.mode === 'league') {
        logToBattle(`League Challenge: Trainer 1 of ${LEAGUE_CHALLENGES}.`);
    }

    setTimeout(() => {
        DOMElements.preloader.style.display = 'none';
        DOMElements.battleArena.classList.add('visible');
        logToBattle(`What will ${getActivePlayerPokemon().name} do?`);
        setTurn('player');
        updateBattleUI();
    }, 1500);
}

function generateBotTeamIds(playerIds: number[]): number[] {
    const categoryIds = CATEGORY_MAP[gameState.category!].filter(id => !playerIds.includes(id));
    const teamSize = (gameState.mode === 'single' || gameState.mode === 'league') ? 1 : TEAM_SIZE;
    
    const botIds: number[] = [];
    while (botIds.length < teamSize && categoryIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * categoryIds.length);
        botIds.push(categoryIds.splice(randomIndex, 1)[0]);
    }
    return botIds;
}

async function createPokemonFromId(id: number): Promise<Pokemon> {
    const data = await fetch(`${BASE_URL}pokemon/${id}`).then(res => res.json());
    const maxHP = data.stats.find((s: any) => s.stat.name === 'hp').base_stat * 3 + 50;
    return {
        id: data.id,
        name: data.name,
        sprite: data.sprites.other['official-artwork']?.front_default || data.sprites.front_default,
        smallSprite: data.sprites.front_default,
        types: data.types.map((t: any) => t.type.name),
        stats: data.stats.map((s: any) => ({ name: s.stat.name, value: s.base_stat })),
        maxHP: maxHP,
        currentHP: maxHP,
        moves: await getMoveDetails(data.moves),
        isFainted: false
    };
}

async function getMoveDetails(moves: any[]): Promise<Move[]> {
    const validMoves = moves.map(m => ({ url: m.move.url })).sort(() => 0.5 - Math.random());
    const selectedMoves: Move[] = [];
    for (const move of validMoves) {
        if (selectedMoves.length >= MOVES_COUNT) break;
        try {
            const moveData = await fetch(move.url).then(res => res.json());
            if (moveData.power) {
                selectedMoves.push({ name: moveData.name.replace(/-/g, ' '), power: moveData.power, type: moveData.type.name });
            }
        } catch (error) { console.warn("Could not fetch move:", move.url); }
    }
    return selectedMoves;
}

function setupBattleScreen() {
    DOMElements.battleTitle.textContent = `${gameState.mode!.charAt(0).toUpperCase() + gameState.mode!.slice(1)} Battle`;
    if (gameState.mode === 'league') {
        DOMElements.battleSubtitle.textContent = `Challenger ${gameState.leagueProgress.wins + 1} / ${LEAGUE_CHALLENGES}`;
    } else {
        DOMElements.battleSubtitle.textContent = `Defeat the opponent's team!`;
    }
    updateBattleUI();
}

function updateBattleUI() {
    const player = getActivePlayerPokemon();
    const bot = getActiveBotPokemon();

    updatePokemonDisplay(DOMElements.player, player);
    renderPlayerMoves(player);
    renderTeamRoster(DOMElements.player.teamRoster, gameState.playerTeam, 'player');

    updatePokemonDisplay(DOMElements.bot, bot);
    renderBotMoves(bot);
    renderTeamRoster(DOMElements.bot.teamRoster, gameState.botTeam, 'bot');
    
    DOMElements.switchBtn.style.display = (gameState.mode === 'team' && !gameState.isBattleOver) ? 'block' : 'none';
}

function updatePokemonDisplay(ui: PokemonDisplayElements, pokemon: Pokemon) {
    ui.name.textContent = pokemon.name;
    ui.img.src = pokemon.sprite;
    ui.img.alt = pokemon.name;
    ui.types.innerHTML = renderTypes(pokemon.types);
    ui.hp.textContent = String(pokemon.currentHP);
    ui.maxHP.textContent = String(pokemon.maxHP);
    const hpPercent = (pokemon.currentHP / pokemon.maxHP) * 100;
    ui.hpBar.style.width = `${hpPercent}%`;
    ui.hpBar.className = 'hp-fill';
    if (hpPercent < 50) ui.hpBar.classList.add('low');
    if (hpPercent < 20) ui.hpBar.classList.add('critical');
}

function renderPlayerMoves(pokemon: Pokemon) {
    const container = DOMElements.player.movesContainer;
    container.innerHTML = '';
    pokemon.moves.forEach(move => {
        const card = document.createElement('div');
        card.className = 'move-card';
        card.innerHTML = `<strong>${move.name}</strong>
                          <div class="move-type"><span class="type-badge type-${move.type}">${move.type}</span></div>
                          <div class="move-power">Power: ${move.power}</div>`;
        if (gameState.turn === 'player' && !gameState.isBattleOver) {
            card.addEventListener('click', () => playerAttack(move));
        } else {
            card.classList.add('disabled');
        }
        container.appendChild(card);
    });
    DOMElements.switchBtn.disabled = gameState.turn !== 'player' || gameState.isBattleOver;
}

function renderBotMoves(pokemon: Pokemon) {
    const grid = DOMElements.bot.movesGrid;
    grid.innerHTML = '';
    pokemon.moves.forEach(move => {
        const card = document.createElement('div');
        card.className = 'move-card disabled';
        card.innerHTML = `<strong>${move.name}</strong>
                          <div class="move-type"><span class="type-badge type-${move.type}">${move.type}</span></div>
                          <div class="move-power">Power: ${move.power}</div>`;
        grid.appendChild(card);
    });
}

function renderTeamRoster(container: HTMLElement, team: Pokemon[], side: 'player' | 'bot') {
    container.innerHTML = '';
    if (team.length <= 1) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';

    team.forEach((pokemon, index) => {
        const rosterIcon = document.createElement('div');
        rosterIcon.className = 'roster-pokemon';
        rosterIcon.innerHTML = `<img src="${pokemon.smallSprite}" alt="${pokemon.name}">`;
        
        if (pokemon.isFainted) rosterIcon.classList.add('fainted');
        
        const isActive = side === 'player' ? index === gameState.activePlayerPokemonIndex : index === gameState.activeBotPokemonIndex;
        if (isActive) rosterIcon.classList.add('active');
        
        if (side === 'player' && !pokemon.isFainted && !isActive) {
            rosterIcon.addEventListener('click', () => {
                if (gameState.turn === 'player') {
                    showSwitchModal();
                }
            });
        }
        container.appendChild(rosterIcon);
    });
}

function setTurn(turn: 'player' | 'bot' | 'processing') {
    gameState.turn = turn;
}

function playerAttack(move: Move) {
    if (gameState.turn !== 'player') return;
    setTurn('processing');
    updateBattleUI(); // Immediately disable buttons
    executeMove('player', 'bot', move);
}

function executeMove(attackerKey: 'player' | 'bot', defenderKey: 'player' | 'bot', move: Move) {
    const attacker = attackerKey === 'player' ? getActivePlayerPokemon() : getActiveBotPokemon();
    const defender = defenderKey === 'player' ? getActivePlayerPokemon() : getActiveBotPokemon();
    const attackerUI = DOMElements[attackerKey];
    
    attackerUI.container.classList.add('attack-anim');
    setTimeout(() => attackerUI.container.classList.remove('attack-anim'), 400);

    logToBattle(`${attacker.name} used <strong>${move.name}</strong> (Power: ${move.power})!`);
    
    const { damage, effectivenessMessage } = calculateDamage(move, attacker, defender);
    
    setTimeout(() => {
        const defenderUI = DOMElements[defenderKey];
        defenderUI.container.classList.add('hit-anim');
        setTimeout(() => defenderUI.container.classList.remove('hit-anim'), 400);

        defender.currentHP = Math.max(0, defender.currentHP - damage);
        updatePokemonDisplay(DOMElements[defenderKey], defender);
        
        let logMessage = effectivenessMessage;
        if (damage > 0) logMessage += ` It dealt <strong>${damage}</strong> damage.`;
        if (logMessage) logToBattle(logMessage);

        if (defender.currentHP === 0) {
            handleFaint(defenderKey);
        } else {
            if (attackerKey === 'player') {
                setTimeout(botTurn, 1500);
            } else {
                setTurn('player');
                updateBattleUI();
            }
        }
    }, 500);
}

function handleFaint(faintedSide: 'player' | 'bot') {
    const faintedPokemon = faintedSide === 'player' ? getActivePlayerPokemon() : getActiveBotPokemon();
    faintedPokemon.isFainted = true;
    logToBattle(`<strong class="loser">${faintedPokemon.name} fainted!</strong>`);
    
    updateBattleUI();

    const remainingTeam = (faintedSide === 'player' ? gameState.playerTeam : gameState.botTeam).filter(p => !p.isFainted);
    
    if (remainingTeam.length === 0) {
        setTimeout(handleBattleEnd, 1000);
        return;
    }
    
    if (faintedSide === 'player') {
        logToBattle('You must choose another Pokémon.');
        showSwitchModal(true); // Force switch
    } else {
        if (gameState.mode === 'league') {
             setTimeout(handleLeagueWin, 1500);
        } else {
             logToBattle(`The opponent is about to send in another Pokémon.`);
             setTimeout(botSwitch, 1500);
        }
    }
}

function handleBattleEnd() {
    gameState.isBattleOver = true;
    const playerWon = gameState.botTeam.every(p => p.isFainted);
    
    if (gameState.mode === 'league') {
        if (playerWon) {
             handleLeagueWin();
        } else {
             showResultScreen(false, "You Lost the Challenge", "Better luck next time!");
        }
    } else {
        const winnerName = playerWon ? gameState.playerTeam.find(p => !p.isFainted)!.name : gameState.botTeam.find(p => !p.isFainted)!.name;
        const message = playerWon ? "You are victorious!" : "You have been defeated!";
        showResultScreen(playerWon, message, `${winnerName} was the key to victory!`);
    }
}

function handleLeagueWin() {
    gameState.leagueProgress.wins++;
    
    if (gameState.leagueProgress.wins >= LEAGUE_CHALLENGES) {
        logToBattle(`<strong class="winner">You defeated the final challenger!</strong>`);
        setTimeout(() => showResultScreen(true, "League Champion!", `You have conquered the ${gameState.category} league!`), 1500);
    } else {
        logToBattle(`<strong class="winner">You defeated the challenger!</strong>`);
        
        DOMElements.leagueTransitionText.innerHTML = `Prepare for Challenger ${gameState.leagueProgress.wins + 1} / ${LEAGUE_CHALLENGES}`;
        DOMElements.leagueTransitionOverlay.classList.add('active');

        logToBattle('Your Pokémon has been fully healed.');
        gameState.playerTeam.forEach(p => { p.currentHP = p.maxHP; p.isFainted = false; });
        
        setTimeout(async () => {
            // Refresh player's moves for the next battle
            const playerPokemon = gameState.playerTeam[0];
            const fullPokemonData = await fetch(`${BASE_URL}pokemon/${playerPokemon.id}`).then(res => res.json());
            playerPokemon.moves = await getMoveDetails(fullPokemonData.moves);
            logToBattle(`<strong>${playerPokemon.name}'s moves have been refreshed!</strong>`);

            // Prepare next opponent
            const botId = generateBotTeamIds(gameState.playerTeam.map(p => p.id))[0];
            gameState.botTeam = [await createPokemonFromId(botId)];
            gameState.activeBotPokemonIndex = 0;
            
            DOMElements.leagueTransitionOverlay.classList.remove('active');
            gameState.isBattleOver = false;
            
            logToBattle(`A new challenger appears!`);
            
            setTurn('player');
            setupBattleScreen();
        }, 3000);
    }
}

function botTurn() {
    if (gameState.isBattleOver) return;
    setTurn('processing');

    const bot = getActiveBotPokemon();
    if (gameState.mode === 'team' && bot.currentHP / bot.maxHP < 0.25) {
        const betterOptionIndex = findBestBotSwitch();
        if (betterOptionIndex !== -1 && betterOptionIndex !== gameState.activeBotPokemonIndex) {
            botSwitch(betterOptionIndex);
            return;
        }
    }
    
    const move = bot.moves[Math.floor(Math.random() * bot.moves.length)];
    executeMove('bot', 'player', move);
}

function findBestBotSwitch(): number {
    const player = getActivePlayerPokemon();
    let bestSwitchIndex = -1;
    let maxScore = -Infinity;

    gameState.botTeam.forEach((bot, index) => {
        if (bot.isFainted) return;
        let score = 0;
        bot.types.forEach(botType => {
            player.types.forEach(playerType => { score += (TYPE_CHART[botType]?.[playerType] ?? 1); });
        });
        player.types.forEach(playerType => {
             bot.types.forEach(botType => { score -= (TYPE_CHART[playerType]?.[botType] ?? 1); });
        });
        
        if (score > maxScore) {
            maxScore = score;
            bestSwitchIndex = index;
        }
    });
    return bestSwitchIndex;
}


// --- SWITCHING LOGIC ---
function showSwitchModal(isForced = false) {
    DOMElements.switchModalGrid.innerHTML = '';
    document.getElementById('closeSwitchModalBtn')!.style.display = isForced ? 'none' : 'inline-block';

    gameState.playerTeam.forEach((pokemon, index) => {
        if (index === gameState.activePlayerPokemonIndex) return;
        const card = createSwitchModalCard(pokemon, index);
        DOMElements.switchModalGrid.appendChild(card);
    });
    DOMElements.switchModal.classList.add('active');
}

function createSwitchModalCard(pokemon: Pokemon, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.id = String(pokemon.id);
    card.innerHTML = `
        <img src="${pokemon.sprite}" alt="${pokemon.name}">
        <h3>${pokemon.name}</h3>
        <div class="pokemon-types">${renderTypes(pokemon.types)}</div>`;
    
    if (pokemon.isFainted) {
        card.classList.add('disabled');
    } else {
        card.addEventListener('click', () => performSwitch(index));
    }
    return card;
}

function performSwitch(index: number) {
    DOMElements.switchModal.classList.remove('active');
    if (index === gameState.activePlayerPokemonIndex || gameState.playerTeam[index].isFainted) return;

    const oldPokemon = getActivePlayerPokemon();
    gameState.activePlayerPokemonIndex = index;
    const newPokemon = getActivePlayerPokemon();
    
    logToBattle(`Come back, ${oldPokemon.name}! Go, ${newPokemon.name}!`);
    
    if (oldPokemon.isFainted) {
        logToBattle(`What will ${newPokemon.name} do?`);
    } else {
        logToBattle(`You switched Pokémon! It's still your turn.`);
    }

    setTurn('player');
    updateBattleUI();
}

function botSwitch(index?: number) {
    const newIndex = index ?? gameState.botTeam.findIndex(p => !p.isFainted);
    if (newIndex === -1) return;

    const oldPokemon = getActiveBotPokemon();
    gameState.activeBotPokemonIndex = newIndex;
    const newPokemon = getActiveBotPokemon();
    
    logToBattle(`${oldPokemon.name} returns! The opponent sends out ${newPokemon.name}!`);

    setTurn('player');
    updateBattleUI();
}

// --- UTILITIES ---
function getActivePlayerPokemon(): Pokemon { return gameState.playerTeam[gameState.activePlayerPokemonIndex]; }
function getActiveBotPokemon(): Pokemon { return gameState.botTeam[gameState.activeBotPokemonIndex]; }

function renderTypes(types: string[]): string {
    return types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join(' ');
}

function logToBattle(message: string) {
    DOMElements.battleLog.innerHTML += `<div class="log-entry">${message}</div>`;
    DOMElements.battleLog.scrollTop = DOMElements.battleLog.scrollHeight;
}

function calculateDamage(move: Move, attacker: Pokemon, defender: Pokemon) {
    const attackStat = attacker.stats.find(s => s.name === 'attack')!.value;
    const defenseStat = defender.stats.find(s => s.name === 'defense')!.value;
    const effectiveness = getEffectiveness(move.type, defender.types);
    let damage = (((2 * 50 / 5) + 2) * move.power * (attackStat / defenseStat) / 50) + 2;
    damage *= effectiveness.multiplier * (Math.random() * (1 - 0.85) + 0.85);
    return { damage: Math.floor(damage), effectivenessMessage: effectiveness.message };
}

function getEffectiveness(moveType: string, targetTypes: string[]) {
    let multiplier = 1;
    targetTypes.forEach(type => {
        const effect = TYPE_CHART[moveType]?.[type];
        if (effect !== undefined) multiplier *= effect;
    });
    let message = '';
    if (multiplier > 1) message = '<span class="effective">It\'s super effective!</span>';
    if (multiplier < 1 && multiplier > 0) message = '<span class="not-very-effective">It\'s not very effective...</span>';
    if (multiplier === 0) message = '<span class="no-effect">It had no effect!</span>';
    return { multiplier, message };
}

function endBattle() {
    resetGameState();
    navigateToScreen('mode');
}

function rematch() {
    [...gameState.playerTeam, ...gameState.botTeam].forEach(p => {
        p.currentHP = p.maxHP;
        p.isFainted = false;
    });

    gameState.activePlayerPokemonIndex = 0;
    gameState.activeBotPokemonIndex = 0;
    gameState.isBattleOver = false;
    DOMElements.battleLog.innerHTML = '';

    navigateToScreen('battle');
    logToBattle('Rematch! The battle begins again!');
    
    setTimeout(() => {
        logToBattle(`What will ${getActivePlayerPokemon().name} do?`);
        setTurn('player');
        setupBattleScreen();
    }, 500);
}

function showResultScreen(isWin: boolean, title: string, message: string) {
    navigateToScreen('result');
    DOMElements.resultTitle.textContent = title;
    DOMElements.resultMessage.textContent = message;
    
    if (gameState.mode === 'single' || gameState.mode === 'team') {
        DOMElements.rematchBtn.style.display = 'inline-block';
    } else {
        DOMElements.rematchBtn.style.display = 'none';
    }

    let imagePokemon: Pokemon | undefined;
    if (isWin) {
        imagePokemon = gameState.playerTeam.find(p => !p.isFainted) || gameState.playerTeam[0];
    } else {
        imagePokemon = gameState.botTeam.find(p => !p.isFainted) || getActiveBotPokemon();
    }
    
    if(imagePokemon) {
        DOMElements.resultImageContainer.innerHTML = `<img src="${imagePokemon.sprite}" alt="${imagePokemon.name}">`;
    }
}

// --- TYPE CHART ---
function toggleTypeChart() {
    DOMElements.typeChartCanvas.classList.toggle('active');
}

function buildTypeChart() {
    DOMElements.chartContent.innerHTML = '';
    for (const [type, effects] of Object.entries(TYPE_CHART)) {
        const card = document.createElement('div');
        card.className = 'type-card';
        const superEffective = Object.entries(effects).filter(([, val]) => val === 2).map(([key]) => key);
        const notVery = Object.entries(effects).filter(([, val]) => val === 0.5).map(([key]) => key);
        const noEffect = Object.entries(effects).filter(([, val]) => val === 0).map(([key]) => key);
        
        card.innerHTML = `<div class="type-header"><span class="type-badge type-${type}">${type}</span> (Attacking)</div>` +
            (superEffective.length ? `<p><strong>2x DMG</strong> vs: ${renderTypes(superEffective)}</p>` : '') +
            (notVery.length ? `<p><strong>0.5x DMG</strong> vs: ${renderTypes(notVery)}</p>` : '') +
            (noEffect.length ? `<p><strong>0x DMG</strong> vs: ${renderTypes(noEffect)}</p>` : '');
        DOMElements.chartContent.appendChild(card);
    }
}

// --- RUN APP ---
DOMContentLoaded = initialize;
