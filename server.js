const path = require("path");
const express = require("express"); 
const app = express(); 

const bodyParser = require("body-parser"); 
app.use(bodyParser.urlencoded({extended:false}));

process.stdin.setEncoding("utf8");

const portNumberUsed = 4000; 
app.listen(portNumberUsed);
console.log(`Web server started and running at http://localhost:${portNumberUsed}`);

app.set("views", path.resolve(__dirname, "Templates"));
app.set("view engine", "ejs");

require("dotenv").config({ path: path.resolve(__dirname, 'CredentialsMongoDB/.env') })

const userNameProvided = String(process.env.MONGO_DB_USERNAME);
const passwordProvided= String(process.env.MONGO_DB_PASSWORD);
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const uri = `mongodb+srv://${userNameProvided}:${passwordProvided}@cluster0.lor7fxh.mongodb.net/?retryWrites=true&w=majority`;
const { MongoClient, ServerApiVersion } = require('mongodb');
const { name } = require("ejs");
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.get("/", (request, response) => { 
    
    response.render("index");

});

app.get("/createTeam", (request, response) => { 
    
    response.render("createTeam");

}); 

async function insertTeam(client, databaseAndCollection, teamData) {
    return await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .insertOne(teamData);
}

app.post("/processTeamStats", async(request, response) => {

    let {teamName, playerOneName, playerTwoName, playerThreeName, playerFourName, playerFiveName} = request.body;

    let teamPlayers = [];
    let playerNames = [];

    playerNames.push(playerOneName);
    playerNames.push(playerTwoName);
    playerNames.push(playerThreeName);
    playerNames.push(playerFourName);
    playerNames.push(playerFiveName);

    try {

        (async () => { 

            let teamInformation = "";
            let teamRating = 0;
            let failed = 0;

            teamInformation += "<table border=1> <caption> <em> <strong> 2022-2023 Season Statistics of Your Team! </strong> </em> </caption>";
            teamInformation += "<thead> <tr> <th> Name </th> <th> Age </th> <th> NBA Team </th> <th> Total Games </th> <th> Minutes Played </th>";
            teamInformation += "<th> Total Field Goals </th> <th> Field % </th> <th> Total 3 Point Field Goals </th> <th> 3 Point Field Goals % </th>";
            teamInformation += "<th> Total 2 Point Field Goals </th> <th> Total 2 Percent Field Goals % </th> <th> Total Points </th> </tr> </thead> <tbody>";
           

            for (let index = 0; index < 5; index++) {

                try {

                    const playerURL = `https://nba-stats-db.herokuapp.com/api/playerdata/name/${playerNames[index]}`;
                    const playerResult = await fetch(playerURL);
                    const playerJSONFile = await playerResult.json();

                    if (playerJSONFile["results"][0] === undefined) {
                        
                        failed = 1;
                        break;
                    
                    }

                    teamPlayers.push(playerJSONFile["results"][0]["player_name"]);

                    teamInformation += "<tr> <td>" + playerJSONFile["results"][0]["player_name"] + "</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["age"] + "</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["team"] + "</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["games"] + "</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["minutes_played"] + "</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["field_goals"] + "/" + playerJSONFile["results"][0]["field_attempts"] + "</td>";
                    teamInformation += "<td>" + (playerJSONFile["results"][0]["field_percent"]*100).toFixed(2) + "%</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["three_fg"] +  "/" + playerJSONFile["results"][0]["three_attempts"] + "</td>";
                    teamInformation += "<td>" + (playerJSONFile["results"][0]["three_percent"]*100).toFixed(2) + "%</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["two_fg"] + "/" + playerJSONFile["results"][0]["two_attempts"] + "</td>";
                    teamInformation += "<td>" + (playerJSONFile["results"][0]["two_percent"]*100).toFixed(2) + "%</td>";
                    teamInformation += "<td>" + playerJSONFile["results"][0]["PTS"] + "</td> </tr>";

                    if (playerJSONFile["results"][0]["PTS"] <= 1000) {

                        teamRating += 1.25;

                    } else if ((playerJSONFile["results"][0]["PTS"] > 1000) && (playerJSONFile["results"][0]["PTS"] <= 1500)) {

                        teamRating += 1.5;

                    } else if ((playerJSONFile["results"][0]["PTS"] > 1500) && (playerJSONFile["results"][0]["PTS"] <= 2000)) {

                        teamRating += 1.75;

                    } else if ((playerJSONFile["results"][0]["PTS"] > 2000) && (playerJSONFile["results"][0]["PTS"] <= 2500)) {

                        teamRating += 2;

                    }

                } catch (error) {

                    console.error(error);

                }

            }

            if (failed === 0) {

                const teamData = {
                    teamName, teamPlayers, teamRating
                };
          
                await client.connect();
                await insertTeam(client, databaseAndCollection, teamData);
                
                teamInformation += "</tbody> </table>";
        
                teamRating += "/10 <em> (This rating is based on the Total points scored by your players in the 22/23 season.) </em>";
        
                const variables = {
                  
                    teamInformation, teamRating
                
                };
        
                response.render("processTeamStats", variables);

            } else {

                response.render("handleNameFailure");

            }

        }) ();

    } catch (error) {

        console.error(error);

    }

});

app.get("/searchTeam", (request, response) => { 
    
    response.render("searchTeam");

}); 

app.post("/processSearchTeam", async(request, response) => { 
    
    let {teamName} = request.body;

    try {

        await client.connect();
        (async () => { 

            let filter = {teamName: teamName};
            const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter);
            
            if (result) {

                let searchTeamName = result.teamName;
                let resultTeamPlayersArray = result.teamPlayers;
                let searchTeamPlayerOne = resultTeamPlayersArray[0];
                let searchTeamPlayerTwo = resultTeamPlayersArray[1]
                let searchTeamPlayerThree = resultTeamPlayersArray[2]
                let searchTeamPlayerFour = resultTeamPlayersArray[3]
                let searchTeamPlayerFive = resultTeamPlayersArray[4]
                let searchTeamRating = result.teamRating;

                const variables = {
                    
                    searchTeamName, searchTeamPlayerOne, searchTeamPlayerTwo, searchTeamPlayerThree, searchTeamPlayerFour, searchTeamPlayerFive, searchTeamRating
               
                };

                response.render("processSearchTeam", variables);

            } else {

                response.render("handleSearchFailure");

            }

        }) ();

    } catch (error) {

        console.error(error);

    } 

}); 