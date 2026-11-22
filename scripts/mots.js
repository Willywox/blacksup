// =========================================================
// BLACK'S UP! — les mots
//
// Les mots sont rangés par catégories : ça permettra plus tard
// de choisir des thèmes avant une partie.
// Pour ajouter un mot : l'écrire entre guillemets, suivi d'une virgule,
// dans la bonne catégorie. Les doublons sont retirés automatiquement.
// =========================================================

const CATEGORIES = {

    "rap-us": {
        nom: "Rap US",
        mots: [
            "Tupac", "The Notorious B.I.G.", "Jay-Z", "Nas", "Snoop Dogg", "Dr. Dre", "Eminem", "50 Cent",
            "Kanye West", "Lil Wayne", "Drake", "Kendrick Lamar", "J. Cole", "Travis Scott", "Nicki Minaj",
            "Cardi B", "Megan Thee Stallion", "Missy Elliott", "Lauryn Hill", "Ice Cube", "Eazy-E", "N.W.A",
            "Wu-Tang Clan", "Busta Rhymes", "DMX", "Ludacris", "Lil Jon", "Pharrell Williams", "Future",
            "Lil Baby", "Post Malone", "A$AP Rocky", "Tyler, the Creator", "Childish Gambino", "Kid Cudi",
            "Pop Smoke", "Juice WRLD", "Lil Uzi Vert", "Playboi Carti", "21 Savage", "Metro Boomin",
            "Doja Cat", "Lil Nas X", "Ice Spice", "GloRilla", "Jack Harlow", "Mac Miller", "Wiz Khalifa",
            "Rick Ross", "Meek Mill", "Gucci Mane", "Migos", "Lil Yachty", "Tyga", "Nelly", "OutKast",
            "Run-DMC", "Public Enemy", "Flavor Flav", "Queen Latifah", "Lil' Kim", "Coolio", "MC Hammer",
            "Vanilla Ice", "Soulja Boy", "Akon", "T-Pain", "Lil Durk", "Young Thug", "Big Sean", "Logic",
            "Gangsta's Paradise", "In Da Club", "Lose Yourself", "Hotline Bling", "Sicko Mode",
            "Old Town Road", "WAP", "Not Like Us", "HUMBLE.", "Gold Digger", "Still D.R.E.",
            "California Love", "Empire State of Mind", "Hey Ya!", "Drop It Like It's Hot", "Without Me",
            "God's Plan", "Mockingbird", "Stan", "Rap God",
            "Freestyle", "Beef", "Diss track", "Mixtape", "Featuring", "Auto-Tune", "Beatbox",
            "Grillz", "Chaîne en or", "Disque de platine", "Côte Est contre Côte Ouest", "Death Row Records",
            "Def Jam", "Battle de rap", "8 Mile", "Straight Outta Compton", "Bling-bling", "Drill",
            "Trap", "Gangsta rap", "Le Grammy du meilleur album rap"
        ]
    },

    "rnb-pop": {
        nom: "R&B, pop & soul",
        mots: [
            "Beyoncé", "Rihanna", "Usher", "Chris Brown", "Alicia Keys", "Mariah Carey", "Whitney Houston",
            "Michael Jackson", "Janet Jackson", "Prince", "Stevie Wonder", "Marvin Gaye", "Aretha Franklin",
            "James Brown", "Ray Charles", "Tina Turner", "Destiny's Child", "TLC", "Aaliyah", "Brandy",
            "Ciara", "Ne-Yo", "John Legend", "Bruno Mars", "The Weeknd", "Frank Ocean", "SZA", "Lizzo",
            "Erykah Badu", "Sade", "Boyz II Men", "Jennifer Hudson", "Tems", "Kehlani",
            "Taylor Swift", "Ariana Grande", "Billie Eilish", "Dua Lipa", "Lady Gaga", "Justin Bieber",
            "Justin Timberlake", "Britney Spears", "Christina Aguilera", "Madonna", "Katy Perry", "Adele",
            "Ed Sheeran", "Harry Styles", "One Direction", "Sabrina Carpenter", "Olivia Rodrigo",
            "Miley Cyrus", "Selena Gomez", "Shakira", "Jennifer Lopez", "Bad Bunny", "Rosalía", "BTS",
            "BLACKPINK", "Coldplay", "Queen", "The Beatles", "Elvis Presley", "Bob Marley",
            "Freddie Mercury", "Daft Punk", "David Guetta", "Calvin Harris", "Avicii", "Celine Dion",
            "Thriller", "Billie Jean", "Crazy in Love", "Single Ladies", "Halo", "Umbrella", "Diamonds",
            "Despacito", "Macarena", "Gangnam Style", "Blinding Lights", "Shape of You",
            "Bohemian Rhapsody", "Toxic", "Baby de Justin Bieber", "Bad Guy", "Hello d'Adele", "Happy",
            "Uptown Funk", "We Are the World", "I Will Always Love You", "Respect", "APT.", "Espresso",
            "Let It Go", "Waka Waka", "Get Lucky", "Titanium",
            "Eras Tour", "Coachella", "Beychella", "Grammy Awards", "BET Awards", "MTV Video Music Awards",
            "Halftime show du Super Bowl", "Fenty Beauty", "Karaoké", "Boys band", "Comédie musicale",
            "Gospel", "Chorale"
        ]
    },

    "musique-fr-afro": {
        nom: "Rap FR, afro & caribéen",
        mots: [
            "Booba", "Kaaris", "La Fouine", "Rohff", "IAM", "NTM", "JoeyStarr", "MC Solaar", "Diam's",
            "Sexion d'Assaut", "Gims", "Black M", "Soprano", "Jul", "PNL", "Ninho", "Niska", "Damso",
            "Nekfeu", "Orelsan", "SCH", "Gazo", "Tiakola", "Werenoi", "Aya Nakamura", "Dadju", "Tayc",
            "Naza", "MHD", "Lacrim", "Hamza", "Bigflo et Oli", "Vald", "Lomepal", "Stromae", "Angèle",
            "Indila", "Wejdene", "Sneazzy", "Alpha Wann", "Koba LaD", "Heuss l'Enfoiré", "Fally Ipupa",
            "Koffi Olomidé", "Magic System", "DJ Arafat", "Burna Boy", "Wizkid", "Davido", "Rema",
            "Calm Down", "Kassav'", "Shatta Wale", "Alpha Blondy", "Youssou N'Dour", "Manu Dibango",
            "Premier Gaou", "Djadja", "Pookie", "Tchikita", "Papaoutai", "Alors on danse",
            "Coupé-décalé", "Afrobeats", "Zouk", "Kompa", "Dancehall", "Reggaeton", "Ndombolo",
            "Mapouka", "Disque d'or", "Planète Rap", "Skyrock", "Les Victoires de la musique",
            "Fête de la musique", "Concert à Bercy", "Stade de France complet", "Feat surprise"
        ]
    },

    "sport": {
        nom: "Sport",
        mots: [
            "LeBron James", "Kobe Bryant", "Michael Jordan", "Stephen Curry", "Shaquille O'Neal",
            "Kevin Durant", "Giannis Antetokounmpo", "Victor Wembanyama", "Tony Parker", "Magic Johnson",
            "Allen Iverson", "Dennis Rodman", "Dwyane Wade", "Kyrie Irving", "Luka Dončić",
            "Chicago Bulls", "Los Angeles Lakers", "Golden State Warriors", "NBA", "Dunk", "Panier à 3 points",
            "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Neymar", "Zinédine Zidane",
            "Thierry Henry", "Ronaldinho", "Pelé", "Diego Maradona", "Didier Drogba", "Samuel Eto'o",
            "Paul Pogba", "Karim Benzema", "Ousmane Dembélé", "Antoine Griezmann", "N'Golo Kanté",
            "Erling Haaland", "Mohamed Salah", "Sadio Mané", "Vinícius Júnior", "Lamine Yamal",
            "Jude Bellingham", "Zlatan Ibrahimović", "David Beckham", "Didier Deschamps",
            "PSG", "Real Madrid", "FC Barcelone", "Olympique de Marseille", "Manchester United", "Liverpool",
            "Ballon d'Or", "Coupe du monde", "Ligue des champions", "Coupe d'Afrique des nations",
            "Carton rouge", "Penalty", "Hors-jeu", "Retourné acrobatique", "La Ola", "Le Siuuu de Ronaldo",
            "Muhammad Ali", "Mike Tyson", "Floyd Mayweather", "Francis Ngannou", "Conor McGregor", "UFC",
            "Serena Williams", "Venus Williams", "Roger Federer", "Rafael Nadal", "Novak Djokovic",
            "Roland-Garros", "Wimbledon", "Usain Bolt", "Simone Biles", "Michael Phelps", "Teddy Riner",
            "Léon Marchand", "Lewis Hamilton", "Formule 1", "Tom Brady", "Super Bowl", "Touchdown",
            "The Rock", "John Cena", "The Undertaker", "Catch", "Jeux olympiques", "Médaille d'or",
            "Marathon", "Tour de France", "Course de relais", "Saut à la perche", "Lancer de javelot",
            "Surf", "Skateboard", "Ski", "Patinage artistique", "Haltérophilie", "Musculation",
            "Arbitre", "Hooligan", "Supporter", "Mercato", "Vestiaire", "Prolongations",
            "Tirs au but", "Banc de touche", "Ramasseur de balles", "Échauffement", "Tacle glissé"
        ]
    },

    "cinema": {
        nom: "Cinéma",
        mots: [
            "Titanic", "Avatar", "Le Parrain", "Scarface", "Pulp Fiction", "Kill Bill", "Django Unchained",
            "Matrix", "Inception", "Interstellar", "Oppenheimer", "Barbie", "Black Panther", "Avengers",
            "Spider-Man", "The Dark Knight", "Joker", "Star Wars", "Jurassic Park", "Le Roi Lion",
            "La Reine des Neiges", "Toy Story", "Shrek", "Le Seigneur des Anneaux", "Harry Potter",
            "Pirates des Caraïbes", "Fast and Furious", "Mission impossible", "James Bond", "Rocky",
            "Creed", "Get Out", "Moonlight", "Boyz n the Hood", "Friday", "Un prince à New York",
            "Bad Boys", "Men in Black", "Rush Hour", "Forrest Gump", "Gladiator", "300", "Rambo",
            "Terminator", "Retour vers le futur", "E.T.", "Les Dents de la mer", "SOS Fantômes",
            "Le Loup de Wall Street", "Very Bad Trip", "Scary Movie", "Fight Club", "Space Jam",
            "Dune", "Top Gun", "John Wick", "Hunger Games", "Twilight", "Deadpool", "Wicked",
            "Parasite", "Intouchables", "La Haine", "Les Visiteurs", "Bienvenue chez les Ch'tis", "Taxi",
            "Astérix et Obélix : Mission Cléopâtre", "Le Dîner de cons", "OSS 117", "Le Fabuleux Destin d'Amélie Poulain",
            "Les Bronzés font du ski", "Encanto", "Vaiana", "Coco", "Ratatouille", "Le Monde de Nemo",
            "Les Indestructibles", "Les Minions", "Moi, moche et méchant", "Kung Fu Panda", "Madagascar",
            "L'Âge de glace", "Cars", "Là-haut", "Vice-Versa", "Aladdin", "La Petite Sirène",
            "Le Livre de la jungle", "Les Évadés", "Seven", "Scream", "Ça", "Saw", "Conjuring",
            "King Kong", "Godzilla", "Rasta Rockett", "Sister Act", "Bodyguard", "Ghost", "Dirty Dancing",
            "Grease", "Pretty Woman", "Mean Girls", "Le Diable s'habille en Prada", "Love Actually",
            "Maman, j'ai raté l'avion", "Le Grinch", "Mamma Mia!", "The Greatest Showman", "La La Land",
            "KPop Demon Hunters", "Sinners", "Spider-Man : New Generation", "Les Gardiens de la Galaxie",
            "Steven Spielberg", "Quentin Tarantino", "Christopher Nolan", "Martin Scorsese", "Spike Lee",
            "Ryan Coogler", "Jordan Peele", "Tyler Perry", "James Cameron", "George Lucas", "Tim Burton",
            "Luc Besson", "Hayao Miyazaki", "Stanley Kubrick", "Alfred Hitchcock",
            "Denzel Washington", "Will Smith", "Samuel L. Jackson", "Morgan Freeman", "Eddie Murphy",
            "Martin Lawrence", "Kevin Hart", "Chris Rock", "Dwayne Johnson", "Idris Elba", "Viola Davis",
            "Halle Berry", "Zendaya", "Michael B. Jordan", "Chadwick Boseman", "Lupita Nyong'o",
            "Jamie Foxx", "Taraji P. Henson", "Whoopi Goldberg", "Wesley Snipes", "Leonardo DiCaprio",
            "Brad Pitt", "Tom Cruise", "Tom Hanks", "Johnny Depp", "Margot Robbie", "Scarlett Johansson",
            "Robert Downey Jr.", "Keanu Reeves", "Jackie Chan", "Bruce Lee", "Jim Carrey",
            "Angelina Jolie", "Jennifer Lawrence", "Timothée Chalamet", "Tom Holland", "Ryan Gosling",
            "Ryan Reynolds", "Vin Diesel", "Jason Statham", "Sylvester Stallone", "Arnold Schwarzenegger",
            "Al Pacino", "Robert De Niro", "Meryl Streep", "Marilyn Monroe", "Charlie Chaplin",
            "Pedro Pascal", "Jenna Ortega", "Cillian Murphy", "Omar Sy", "Jamel Debbouze",
            "Jean Dujardin", "Marion Cotillard", "Kev Adams", "Louis de Funès",
            "Oscars", "Festival de Cannes", "Tapis rouge", "Bande-annonce", "Popcorn au cinéma",
            "Cascadeur", "Film d'horreur", "Comédie romantique", "Suite décevante", "Spoiler"
        ]
    },

    "series-tele": {
        nom: "Séries & télé",
        mots: [
            "Le Prince de Bel-Air", "Friends", "Breaking Bad", "Game of Thrones", "House of the Dragon",
            "Stranger Things", "La Casa de Papel", "Squid Game", "Lupin", "Peaky Blinders", "Prison Break",
            "The Walking Dead", "Grey's Anatomy", "Desperate Housewives", "How I Met Your Mother",
            "The Office", "Les Simpson", "South Park", "Les Griffin", "Rick et Morty", "Bob l'éponge",
            "Ma famille d'abord", "Tout le monde déteste Chris", "Atlanta", "Power", "Empire",
            "Insecure", "Euphoria", "Snowfall", "The Boys", "Mercredi", "La Chronique des Bridgerton",
            "The Crown", "Sex Education", "Black Mirror", "Narcos", "The Last of Us", "Arcane",
            "The Witcher", "The Mandalorian", "Dexter", "Lost", "Gossip Girl", "Hannah Montana",
            "Phénomène Raven", "Dr House", "Les Experts", "Malcolm", "Scrubs", "Totally Spies",
            "Les Sopranos", "The Wire", "Suits", "Vikings", "Emily in Paris", "Shameless",
            "Kaamelott", "Plus belle la vie", "Caméra Café", "Validé", "Scènes de ménages",
            "Koh-Lanta", "Les Marseillais", "Fort Boyard", "Qui veut gagner des millions ?",
            "Star Academy", "The Voice", "Top Chef", "Pékin Express", "L'amour est dans le pré",
            "Les Kardashian", "Questions pour un champion", "Les Guignols de l'info", "Le Bigdil",
            "Télé-achat", "Le Juste Prix", "Un dîner presque parfait", "Mariés au premier regard",
            "Netflix and chill", "Binge-watching", "Cliffhanger", "Générique de fin", "Saison 2",
            "Télécommande", "Zapping", "Météo à la télé", "Journal de 20 heures"
        ]
    },

    "manga": {
        nom: "Manga & anime",
        mots: [
            "Dragon Ball Z", "One Piece", "Naruto", "Bleach", "Death Note", "L'Attaque des Titans",
            "My Hero Academia", "Demon Slayer", "Jujutsu Kaisen", "Hunter x Hunter", "Fullmetal Alchemist",
            "One Punch Man", "Tokyo Ghoul", "Chainsaw Man", "Solo Leveling", "Blue Lock", "Olive et Tom",
            "Les Chevaliers du Zodiaque", "Sailor Moon", "Pokémon", "Yu-Gi-Oh!", "Digimon",
            "Spy x Family", "Haikyū!!", "Black Clover", "Fairy Tail", "Le Voyage de Chihiro",
            "Mon voisin Totoro", "Princesse Mononoké", "Akira", "Ken le Survivant", "City Hunter",
            "Captain Tsubasa", "Detective Conan", "Dragon Ball Super",
            "Goku", "Vegeta", "Kamehameha", "Super Saiyan", "Les Boules de cristal", "Freezer",
            "Luffy", "Zoro", "Fruit du Démon", "Naruto qui court", "Sasuke", "Kakashi", "Itachi",
            "Rasengan", "Sharingan", "Light Yagami", "Ryuk", "Tanjiro", "Gojo", "Saitama",
            "Pikachu", "Sacha", "Dracaufeu", "Mewtwo", "Ronflex", "Rondoudou", "Attrapez-les tous !",
            "Dresseur Pokémon", "Pokéball", "Otaku", "Cosplay", "Japan Expo", "Shonen"
        ]
    },

    "univers-cultes": {
        nom: "Personnages & univers cultes",
        mots: [
            "Hermione Granger", "Ron Weasley", "Dumbledore", "Voldemort", "Rogue", "Dobby", "Hagrid",
            "Poudlard", "Quidditch", "Le Choixpeau", "Expelliarmus", "Avada Kedavra", "Vif d'or",
            "Baguette magique", "Cape d'invisibilité", "Le Quai 9 ¾", "Moldu",
            "Dark Vador", "Yoda", "Luke Skywalker", "Chewbacca", "Sabre laser", "Je suis ton père",
            "Stormtrooper", "Gandalf", "Gollum", "Frodon", "Mon précieux", "L'Anneau unique",
            "Iron Man", "Captain America", "Thor", "Hulk", "Black Widow", "Thanos", "Wolverine",
            "Le claquement de doigts de Thanos", "Wakanda Forever", "Batman", "Superman", "Wonder Woman",
            "Le Joker", "Harley Quinn", "Catwoman", "Aquaman", "Flash",
            "Jon Snow", "Daenerys Targaryen", "Tyrion Lannister", "Le Trône de fer", "Winter is coming",
            "Dragon", "Marcheur blanc",
            "Mickey Mouse", "Minnie", "Donald Duck", "Simba", "Timon et Pumbaa", "Hakuna Matata",
            "Elsa", "Olaf", "L'Âne de Shrek", "Le Chat potté", "Buzz l'Éclair", "Woody", "Stitch",
            "Le Génie d'Aladdin", "Cendrillon", "Blanche-Neige", "La Belle et la Bête", "Raiponce",
            "Mulan", "Pocahontas", "Tiana", "Peter Pan", "Clochette", "Pinocchio", "Dumbo", "Bambi",
            "Jack Sparrow", "Indiana Jones", "Rocky Balboa", "Tony Montana", "Hannibal Lecter",
            "Freddy Krueger", "Chucky", "Ghostface", "Pennywise", "Annabelle", "Jason Voorhees",
            "Dracula", "Frankenstein", "Momie", "Zombie", "Loup-garou", "Vampire",
            "Sherlock Holmes", "Tintin", "Milou", "Astérix", "Obélix", "Idéfix", "Lucky Luke",
            "Les Schtroumpfs", "Gargamel", "Garfield", "Snoopy", "Homer Simpson", "Bart Simpson",
            "Scooby-Doo", "Tom et Jerry", "Bugs Bunny", "Titi et Grosminet", "Bip Bip et Coyote",
            "Popeye", "Casper", "Barbie", "Ken", "Le Père Noël", "Le Lapin de Pâques", "La petite souris",
            "Mario", "Luigi", "Princesse Peach", "Bowser", "Yoshi", "Sonic", "Pac-Man", "Lara Croft",
            "Kratos", "Link", "Zelda", "Kirby", "Donkey Kong", "Steve de Minecraft", "Creeper",
            "GTA", "EA Sports FC", "Call of Duty", "Fortnite", "Minecraft", "Among Us", "Roblox",
            "League of Legends", "Mario Kart", "Tetris", "Candy Crush", "Pokémon GO", "Clash Royale",
            "Red Dead Redemption", "Street Fighter", "Mortal Kombat", "Tekken", "Just Dance",
            "Super Smash Bros.", "Assassin's Creed", "The Sims", "Animal Crossing",
            "PlayStation", "Xbox", "Nintendo Switch", "Game Boy", "Wii", "Manette", "Game Over",
            "Boss de fin", "Rage quit", "Cheat code"
        ]
    },

    "internet": {
        nom: "Internet, réseaux & mèmes",
        mots: [
            "Instagram", "TikTok", "Snapchat", "YouTube", "Twitch", "X (Twitter)", "Facebook", "WhatsApp",
            "Netflix", "Spotify", "Tinder", "Uber", "Uber Eats", "Amazon", "ChatGPT", "Intelligence artificielle",
            "Google", "Wikipédia", "Siri", "Shazam", "Vinted", "Leboncoin", "Deliveroo", "Waze",
            "iPhone", "AirPods", "Selfie", "Story Instagram", "Live TikTok", "Influenceur", "Youtubeur",
            "Streamer", "Hashtag", "Like", "Emoji", "GIF", "Mème", "Filtre Snapchat", "Commentaire haineux",
            "Abonnés", "Certification bleue", "Placement de produit", "Code promo", "Vu à 3h du matin",
            "Message vocal", "Groupe WhatsApp de la famille", "Notification", "Mot de passe oublié",
            "Wi-Fi", "Batterie à 1 %", "Mode avion", "Captcha", "Bug", "Hacker", "Fake news", "Deepfake",
            "Rickroll", "Ice Bucket Challenge", "Mannequin Challenge", "Harlem Shake", "Le Dab",
            "Le Floss", "Le Griddy", "Skibidi Toilet", "Rizz", "Aura", "Delulu", "6-7", "Brainrot",
            "Sigma", "NPC", "Main character", "Red flag", "Green flag", "Situationship", "Crush", "Ratio",
            "Cringe", "Flex", "Drip", "Swag", "Bae", "GOAT", "FOMO", "POV", "Glow up", "Slay",
            "Ghosting", "Stan", "Clash en commentaire", "Thread", "Unboxing", "ASMR", "Tuto maquillage",
            "Vlog", "Haul", "Mukbang", "Prank", "Réaction en live", "Clickbait", "Algorithme",
            "Wesh", "Frérot", "Askip", "Avoir le seum", "Chiller", "Gênance", "Dinguerie",
            "C'est carré", "Masterclass", "En PLS", "Le sang de la veine", "Wallah", "Tiens tiens tiens",
            "MrBeast", "Squeezie", "Inoxtag", "IShowSpeed", "Kai Cenat", "Cyprien", "Norman",
            "Elon Musk", "Mark Zuckerberg", "Jeff Bezos", "Steve Jobs", "Bill Gates",
            "Kim Kardashian", "Kylie Jenner", "Nabilla", "Labubu", "Chocolat de Dubaï", "Bubble tea",
            "Crocs", "Trottinette électrique", "Bitcoin", "NFT", "Visio sur Zoom", "Télétravail"
        ]
    },

    "marques-mode": {
        nom: "Marques, mode & style",
        mots: [
            "Nike", "Air Jordan", "Air Force 1", "Adidas", "Yeezy", "Puma", "New Balance", "Supreme",
            "Off-White", "Gucci", "Louis Vuitton", "Balenciaga", "Versace", "Chanel", "Dior", "Prada",
            "Hermès", "Lacoste", "Ralph Lauren", "Tommy Hilfiger", "The North Face", "Moncler",
            "Canada Goose", "Timberland", "Converse", "Vans", "Rolex", "Cartier", "Skims", "Zara",
            "H&M", "Shein", "Sephora", "Virgil Abloh",
            "Tesla", "Lamborghini", "Ferrari", "Mercedes", "Range Rover", "Coca-Cola", "Pepsi",
            "McDonald's", "KFC", "Burger King", "Starbucks", "Red Bull", "Nutella", "Haribo", "IKEA",
            "Apple", "Samsung", "Lego", "Disney+",
            "Durag", "Grillz", "Bob", "Survêtement", "Casquette à l'envers", "Lunettes de soleil",
            "Doudoune", "Sac banane", "Tresses africaines", "Afro", "Dreadlocks", "Perruque",
            "Ongles en gel", "Tatouage", "Piercing", "Barbe bien taillée", "Dégradé chez le coiffeur",
            "Fashion Week", "Met Gala", "Défilé de mode", "Mannequin", "Talons aiguilles",
            "Costume trois pièces", "Robe de soirée", "Contrefaçon", "Soldes", "Cabine d'essayage",
            "Sneakers en édition limitée", "Faire la queue pour des sneakers"
        ]
    },

    "moments": {
        nom: "Moments & événements cultes",
        mots: [
            "Covid-19", "Confinement", "Masque chirurgical", "Attestation de sortie",
            "Applaudissements de 20 heures", "Pénurie de papier toilette", "Gel hydroalcoolique",
            "Test PCR", "JO de Paris 2024", "La France championne du monde 2018",
            "La finale Argentine-France 2022", "Le coup de boule de Zidane", "La main de Dieu",
            "La gifle de Will Smith aux Oscars", "Kanye interrompt Taylor Swift",
            "Le clash Drake contre Kendrick", "Kendrick Lamar au Super Bowl", "Beyoncé à Coachella",
            "Le moonwalk de Michael Jackson", "Obama élu président", "Barbenheimer",
            "Allô, non mais allô quoi", "L'incendie de Notre-Dame", "Le mariage de Harry et Meghan",
            "Les Gilets jaunes", "Le Brexit", "Le bug de l'an 2000", "Premier pas sur la Lune",
            "La chute du mur de Berlin", "Le 11 septembre", "Le naufrage du Titanic",
            "Le Nouvel An", "Le compte à rebours du 31 décembre", "La Saint-Valentin", "Halloween",
            "Noël", "Le Ramadan", "L'Aïd", "Un anniversaire surprise", "Une demande en mariage",
            "Un mariage", "Une gender reveal party", "Un baby shower", "Une crémaillère",
            "Le bac", "Les vacances d'été", "La rentrée scolaire", "Le Black Friday",
            "La finale de la Coupe du monde", "L'élection présidentielle", "Le Super Bowl",
            "La cérémonie des Oscars", "Le carnaval de Rio", "La Fashion Week de Paris",
            "Une éclipse solaire", "Une panne d'électricité géante", "Une grève de la SNCF"
        ]
    },

    "histoire": {
        nom: "Histoire & grandes figures",
        mots: [
            "Napoléon", "Jules César", "Cléopâtre", "Toutânkhamon", "Jeanne d'Arc", "Louis XIV",
            "Marie-Antoinette", "Charlemagne", "Martin Luther King", "Malcolm X", "Rosa Parks",
            "Nelson Mandela", "Barack Obama", "Michelle Obama", "Gandhi", "Che Guevara",
            "Abraham Lincoln", "John F. Kennedy", "Winston Churchill", "Charles de Gaulle",
            "Thomas Sankara", "Patrice Lumumba", "Mansa Moussa", "Shaka Zulu", "Hannibal",
            "Albert Einstein", "Isaac Newton", "Marie Curie", "Léonard de Vinci", "Christophe Colomb",
            "Neil Armstrong", "Elizabeth II", "Lady Diana", "Gengis Khan", "Attila", "Spartacus",
            "Robin des Bois", "Le roi Arthur", "Mère Teresa", "Simone Veil", "Joséphine Baker",
            "La Révolution française", "La prise de la Bastille", "La Première Guerre mondiale",
            "La Seconde Guerre mondiale", "Le Débarquement", "L'abolition de l'esclavage",
            "La fin de l'apartheid", "I Have a Dream", "La guerre froide", "La conquête spatiale",
            "La Préhistoire", "Les dinosaures", "L'homme de Cro-Magnon", "L'Égypte ancienne",
            "Les pharaons", "Les Vikings", "Les samouraïs", "Les chevaliers", "Les pirates",
            "Les gladiateurs", "Le Moyen Âge", "La Renaissance", "La ruée vers l'or", "Le Far West",
            "Les cow-boys", "La Prohibition", "Les années folles", "Mai 68", "Woodstock",
            "La découverte de l'Amérique", "L'invention de l'imprimerie", "L'invention de la roue",
            "La découverte du feu", "Le premier iPhone"
        ]
    },

    "culture-generale": {
        nom: "Littérature, art & sciences",
        mots: [
            "Victor Hugo", "Molière", "Shakespeare", "Jules Verne", "Jean de La Fontaine",
            "Alexandre Dumas", "Aimé Césaire", "Stephen King", "J.K. Rowling", "Agatha Christie",
            "Roméo et Juliette", "Les Misérables", "Le Petit Prince", "Les Trois Mousquetaires",
            "Le Comte de Monte-Cristo", "Alice au pays des merveilles", "Le Petit Chaperon rouge",
            "La Belle au bois dormant", "Hansel et Gretel", "Les Trois Petits Cochons", "Boucles d'or",
            "Le Tour du monde en 80 jours", "Vingt mille lieues sous les mers", "Don Quichotte",
            "Les Fables de La Fontaine", "La Cigale et la Fourmi", "Le Corbeau et le Renard",
            "Le Lièvre et la Tortue", "Les Mille et Une Nuits", "Ali Baba", "Le Journal d'Anne Frank",
            "La Joconde", "Picasso", "Van Gogh", "Frida Kahlo", "Jean-Michel Basquiat", "Andy Warhol",
            "Banksy", "Michel-Ange", "Salvador Dalí", "Claude Monet", "La Nuit étoilée", "Le Cri",
            "Le Penseur de Rodin", "La Vénus de Milo", "La Chapelle Sixtine", "Graffiti", "Street art",
            "Mozart", "Beethoven", "Opéra", "Orchestre", "Chef d'orchestre", "Ballet", "Le Lac des cygnes",
            "La théorie du Big Bang", "Un trou noir", "L'ADN", "La gravité", "Le système solaire",
            "La Voie lactée", "Une étoile filante", "Une comète", "Un volcan", "Un tremblement de terre",
            "Un tsunami", "Une tornade", "Un arc-en-ciel", "Une aurore boréale", "La photosynthèse",
            "Le tableau périodique", "Un microscope", "Un télescope", "Un robot", "Une fusée",
            "Un astronaute", "Un extraterrestre", "Une soucoupe volante", "La Station spatiale internationale",
            "Le réchauffement climatique", "Le recyclage", "Le cerveau", "Le cœur", "Un squelette",
            "Une greffe", "Un vaccin", "Les mathématiques", "Pi", "Une équation", "La philosophie",
            "Socrate", "Platon", "Aristote", "Sigmund Freud", "Charles Darwin", "La théorie de l'évolution"
        ]
    },

    "lieux": {
        nom: "Lieux & monuments",
        mots: [
            "Paris", "New York", "Los Angeles", "Atlanta", "Miami", "Las Vegas", "Compton", "Brooklyn",
            "Harlem", "Hollywood", "Londres", "Tokyo", "Dubaï", "Marrakech", "Dakar", "Abidjan",
            "Kinshasa", "Lagos", "Johannesburg", "Rio de Janeiro", "Rome", "Barcelone", "Marseille",
            "Venise", "Amsterdam", "Bali", "Les Maldives", "La Jamaïque", "La Guadeloupe", "La Martinique",
            "La Réunion", "Tour Eiffel", "Arc de Triomphe", "Champs-Élysées", "Statue de la Liberté",
            "Times Square", "Burj Khalifa", "Pyramides de Gizeh", "Le Sphinx", "Grande Muraille de Chine",
            "Colisée", "Tour de Pise", "Taj Mahal", "Machu Picchu", "Louvre", "Disneyland",
            "Maison Blanche", "Mont Everest", "Sahara", "Amazonie", "Antarctique", "Pôle Nord",
            "Alcatraz", "Zone 51", "Triangle des Bermudes", "Wakanda", "Gotham City", "Atlantide",
            "Le Mont-Saint-Michel", "Versailles", "Big Ben", "Buckingham Palace", "Stonehenge",
            "Les chutes du Niagara", "Le Grand Canyon", "Hollywood Walk of Fame", "Le Vatican",
            "Une île déserte", "Un aéroport", "Une boîte de nuit", "Un casino", "Une prison",
            "Un hôpital", "Une salle de sport", "Un salon de coiffure", "Un kebab à 3h du matin",
            "Un fast-food", "Un parc d'attractions", "Une fête foraine", "Un zoo", "Un cirque",
            "Un musée", "Un cimetière", "Une maison hantée", "Une plage", "Une piscine", "Un sauna",
            "Un ascenseur", "Un escalator", "Un métro bondé", "Un embouteillage"
        ]
    },

    "actions-droles": {
        nom: "Actions & expressions drôles",
        mots: [
            "Faire le moonwalk", "Twerker", "Faire la chenille", "Danser comme un papa en soirée",
            "Danser le zouk", "Danser la macarena", "Danser le coupé-décalé", "Faire un battle de danse",
            "Faire de l'air guitar", "Faire du beatbox", "Rapper en freestyle", "Chanter faux au karaoké",
            "Chanter sous la douche", "Faire un selfie raté", "Prendre un râteau", "Se faire ghoster",
            "Liker la photo de son ex par erreur", "Envoyer un vocal de 5 minutes",
            "Écrire un message puis tout effacer", "Laisser quelqu'un en vu", "Stalker un crush",
            "Rater une marche", "Glisser sur une peau de banane", "Se cogner le petit orteil",
            "Marcher sur un Lego", "Éternuer en plein silence", "Avoir le hoquet", "Ronfler",
            "Bâiller en réunion", "Chercher ses clés partout", "Chercher le Wi-Fi", "Courir après le bus",
            "Dire « J'arrive dans 5 minutes »", "Être en retard", "S'endormir devant un film",
            "Faire semblant de dormir", "Faire semblant d'écouter", "Faire la grasse matinée",
            "Spoiler la fin d'une série", "Se brûler avec un plat chaud", "Croquer dans un piment",
            "Manger avec les doigts", "Se tacher en mangeant", "Avoir la gueule de bois",
            "Se faire recaler à l'entrée de la boîte", "Partager l'addition au centime près",
            "Monter un meuble IKEA", "Faire un plat en piscine", "Prendre une douche froide",
            "Se faire piquer par un moustique", "Avoir peur d'une araignée", "Fuir une guêpe",
            "Le regard de la daronne", "La claquette de la daronne", "Se faire engueuler par sa mère",
            "Se recoiffer dans le miroir", "Mettre trop de parfum", "Mettre son durag",
            "Repasser une chemise", "Faire la vaisselle", "Passer l'aspirateur", "Promener son chien",
            "Changer une couche", "Bercer un bébé", "Soulever des haltères", "Faire des pompes",
            "Faire du yoga", "Faire du gainage", "Avoir des courbatures", "Turbulences en avion",
            "Passer le portique de sécurité", "Faire un créneau", "Se faire flasher", "Faire du stop",
            "Tomber en panne d'essence", "Faire un check", "Faire un câlin trop long",
            "Faire un clin d'œil", "Faire les yeux doux", "Draguer en soirée", "Faire un bisou volé",
            "Se prendre une porte vitrée", "Taper un sprint", "Se perdre avec le GPS",
            "Se battre pour la dernière part de pizza", "Ouvrir un cadeau nul", "Souffler les bougies",
            "Faire un discours de mariage", "Pleurer devant un film", "Rire au mauvais moment",
            "Avoir un fou rire", "Faire une blague nulle", "Lancer un regard noir", "Se faire griller",
            "Faire la tête", "Péter un câble", "Avoir la flemme", "Rouler des mécaniques", "Se la raconter",
            "Avoir le melon", "Faire le malin", "Jeter l'éponge", "Avoir la chair de poule",
            "Raconter des salades", "Donner sa langue au chat", "Les doigts dans le nez",
            "Avoir le cœur sur la main", "Tomber dans les pommes", "Poser un lapin",
            "Avoir un poil dans la main", "Coûter un bras", "Casser les pieds",
            "Prendre ses jambes à son cou", "Mettre les pieds dans le plat", "Marcher sur des œufs",
            "Avoir un chat dans la gorge", "Être dans la lune", "Avoir les yeux plus gros que le ventre",
            "Pleuvoir des cordes", "Tirer les vers du nez", "Faire d'une pierre deux coups",
            "Avoir le beurre et l'argent du beurre", "Couper la poire en deux", "Mettre sa main à couper",
            "Se mettre sur son trente-et-un", "Avoir la tête dans le guidon", "Tourner autour du pot",
            "Mettre le feu à la piste", "Avoir deux mains gauches", "Se faire avoir comme un bleu"
        ]
    },

    "bouffe-soiree": {
        nom: "Bouffe & soirée",
        mots: [
            "Pizza", "Burger", "Tacos français", "Kebab", "Sushi", "Ramen", "Poulet frit",
            "Poulet braisé", "Alloco", "Attiéké", "Mafé", "Yassa", "Thiéboudienne", "Couscous", "Tajine",
            "Accras de morue", "Riz jollof", "Banane plantain", "Fufu", "Bokit", "Croissant", "Baguette",
            "Crêpe", "Raclette", "Fondue", "Croque-monsieur", "Pâtes carbonara", "Lasagnes", "Hot-dog",
            "Burrito", "Chicken wings", "Mac and cheese", "Pancakes", "Donut", "Popcorn", "Chips",
            "Nutella", "Glace", "Barbe à papa", "Bonbons", "Chocolat chaud", "Champagne", "Cocktail",
            "Mojito", "Chicha", "Barbecue", "Apéro", "Brunch", "Pique-nique", "Buffet à volonté",
            "Fontaine de chocolat", "Gâteau d'anniversaire", "Bûche de Noël", "Galette des rois",
            "Ketchup", "Mayonnaise", "Sauce samouraï", "Sauce piquante", "Piment", "Avocat", "Ananas",
            "Pastèque", "Mangue", "Noix de coco", "Fraise", "Banane", "Citron", "Oignon qui fait pleurer",
            "Escargots", "Cuisses de grenouille", "Huîtres", "Frites", "Omelette", "Œuf au plat",
            "Céréales", "Café", "Thé à la menthe", "Jus de bissap", "Smoothie", "Plateau-repas",
            "Repas de famille", "Livreur Uber Eats", "Micro-ondes", "Friteuse", "Grille-pain"
        ]
    }
}

// Tous les mots, sans doublons (même écrits avec une majuscule ou un accent différent)
const TOUSLESMOTS = (function () {
    const vus = new Set()
    const liste = []
    Object.keys(CATEGORIES).forEach(function (cle) {
        CATEGORIES[cle].mots.forEach(function (mot) {
            const m = (mot || "").trim()
            const empreinte = m.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
            if (m && !vus.has(empreinte)) {
                vus.add(empreinte)
                liste.push(m)
            }
        })
    })
    return liste
})()
