//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// All website layouts, designs, coding and functionality are Copyright © 2023 Robert Morabito, David Bailey, Maheen Samad, Fahad Arain, Dana Dobrosavljevic, and Jordan Bharati All right reserved.
//
// You may not otherwise copy, modify, or distribute this website (https://museum-mate-v1.vercel.app/) or the code contained in any manner.
// You may not remove or alter any copyright or other notice from this code or this website (https://museum-mate-v1.vercel.app/).
// 
// If you have further inquiry contact:
// Robert Morabito
// Developer
// hello@robertmorabito.ca
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import { GenerateBasic } from "./GPT-3";
import { db } from './Firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';

// This method uses GPT-3 to confirm a natural language input against a set list of data. It requires the set list, input, and a string of training data
export const ConfirmLocation = async (list, inputText, exampleData) => {
    inputText = RemoveLines(inputText);
    const prompt = "Return closest match to the Input from the List. If no match is found, return other." + "\nList: " + list.join(', ') +
        "\n" + exampleData + "Input: " + inputText + "\nOutput:";
    const temp = await GenerateBasic("text-davinci-003", prompt);
    return temp;
}

// This method removes unnecessary spaces from GPT generated responses
export function RemoveLines(inputText) {
    let temp = inputText.replace(/[\s]/g, '');
    return temp
}

// This method finds the levenshtein distance between 2 strings
export function LevenshteinDistance(input, candidate) {
    let inLen = input.length; // Length of input string
    let canLen = candidate.length;  // Length of candidate string
    let distMat = Array(inLen + 1).fill(null).map(() => Array(canLen + 1).fill(null)); // Distance matrix
    let cost

    // Populate matrix with the strings
    for (let i = 0; i <= inLen; i++) {
        distMat[i][0] = i;
    }
    for (let i = 0; i <= canLen; i++) {
        distMat[0][i] = i;
    }
    for (let j = 1; j <= canLen; j++) {
        for (let i = 1; i <= inLen; i++) {
            cost = (input[i - 1] === candidate[j - 1]) ? 0 : 1; // Cost of current letter substitution
            distMat[i][j] = Math.min(
                distMat[i][j - 1] + 1, // Cost of Deletion
                distMat[i - 1][j] + 1, // Cost of Insertion
                distMat[i - 1][j - 1] + cost  // Cost of Substitution
            );
        }
    }
    return distMat[inLen][canLen];
}

// This method calculates the likeness of 2 phrases
export function CalcSim(input, candidate){
    // Split the inputs into substrings by delimiters
    const inWords = input.split(/[\s_-]/);
    const canWords = candidate.split(/[\s_-]/);
    let total = 0;

    for(let i = 0; i < inWords.length; i++){
        let best = candidate.length;
        for(let j = 0; j < canWords.length; j++){
            // Calculate the levenshtein distance between the current words in the phrases
            let dist = LevenshteinDistance(inWords[i], canWords[j]);

            // Keep track of the smallest distance so far
            if(dist < best){
                best = dist;
            }

            // If the distance is zero then we have found the best match
            if(dist === 0){
                break;
            }
        }
        // Add the best distance to the total
        total += best;
    }
    return total;
}

// This method searches the database for a given input
export async function SearchDB(input){
    // Local Variables
    const artifactRef = collection(db, "artifacts");
    let output = [];
    let min = Infinity;

    // Search the database for the closest matching GPTName to the user input and store the data in a 2Darray
    const querySnapshot = await getDocs(artifactRef);
    querySnapshot.forEach((doc) => {
        let GPTName = doc.data().GPTName;
        //console.log(doc.data().Id);

        // Use Levenshtein Distance to get a number metric for the closeness of string to the input and record the description
        let temp = CalcSim(input, GPTName);

        // We want the smallest value, meaning closest
        if (temp < min) {
            min = temp;
            output = [doc.data().Description, doc.data().images[0], doc.data().Location]
        }
    });

    return output;
}

/*
 * Below is a collection of few shot or zero shot training data for various tasks
 */
// Prefix for defining the characteristics of the query chat
export var _queryPrefix = `Response Tone:
Use a friendly and enthusiastic tone that engages the user.
Be polite, respectful, and humble in all responses.

Response Style:
Use descriptive and engaging language to make responses interesting and informative.
Vary sentence length and structure to keep responses dynamic and engaging.
Avoid using jargon or technical language that the user may not understand.

Response Structure:
Break up responses into small paragraphs that each focus on a specific topic or idea.
Use headings or bullet points to organize information and make it easier to read.
Use transition words to connect ideas and make the response flow smoothly.

Response Content:
Only use information from the current conversation to provide relevant and accurate responses.
When asked about unknown information, respond with "I'm sorry, but I don't have that information at the moment. Is there anything else I can help you with?"
Do not generate any new information or facts that are not already present in the current conversation.
If the user asks a question that MuseumMate cannot answer with the current conversation's information, politely explain that MuseumMate is not able to provide a response at this time.`;

// Prefix for defining the characteristics of the directions chat
export var _directionPrefix = `Response Tone:
Use a friendly and enthusiastic tone that engages the user.
Be polite, respectful, and humble in all responses.

Response Style:
Vary sentence length and structure to keep responses dynamic and engaging.

Response Structure:
Always respond with a numbered list included
Use transition words to connect ideas and make the response flow smoothly.

Response Content:
Only use information from the current conversation to provide relevant and accurate responses.
Do not make any assumptions about the environment or add any new information not provided in the conversation.
When asked about unknown information, respond with "I'm sorry, but I don't have that information at the moment. Is there anything else I can help you with?"
Do not generate any new information or facts that are not already present in the current conversation.
If the user asks a question that MuseumMate cannot answer with the current conversation's information, politely explain that MuseumMate is not able to provide a response at this time.

Examples:
path: straight
1. Simply head straight ahead and you'll be there soon!

path: left
1. Just make a left-hand turn and you will be at your destination!

path: right, sharp left, straight, slight right
I would be more than happy to get you there! Just follow these directions:
1. Make a right-hand turn.
2. Now make a sharp left turn and continue straight.
3. Finally, turn a bit right and you will be at your destination!

path: straight, sharp right, straight, left, left, straight, slight right
I love that exhibit! If you follow these directions you will be there ASAP:
1. Head out in a straight path.
2. Next, make a sharp right-hand turn and continue straight for a little while 
3. Make a left turn followed by another left turn (like a u-turn)
4. Continue straight for a bit longer
5. Finally, make a slight right turn and you'll be right where you want to be!

path: slight left, straight, right, sharp right, straight, slight left, left
You're in for a treat! Just adhere to these instructions and you'll arrive in no time:
1. Begin by taking a slight left turn.
2. Continue straight ahead for some distance.
3. Make a right-hand turn, followed by a sharp right.
4. Proceed straight for a while.
5. Turn slightly to the left and then make a complete left turn.
6. Your destination will be just around the corner!

path: straight, slight right, sharp left, right, straight, sharp left, slight right, straight
This place is fantastic! Follow these directions, and you'll be there quickly:
1. Start by going straight forward.
2. Turn slightly to the right and continue.
3. Make a sharp left turn, then take an immediate right.
4. Keep going straight for a short distance.
5. Turn sharply to the left, followed by a slight right.
6. Keep moving straight, and you'll soon arrive at your destination!

path: sharp right, slight left, straight, left, slight right
You'll definitely enjoy it there! Just stick to these steps, and you'll be on your way:
1. Start off with a sharp right-hand turn.
2. Make a slight left turn and continue in a straight path.
3. Next, take a left turn.
4. Finish up with a slight right turn, and you'll have reached your destination!

`;

// Start prompt
export var _startPrompt = "Hi! I am MuseumMate and I can provide information on all the exhibits around you as well as directions to anywhere in the museum!"

// MuseumMate information
export var _museumInfo = [["MuseumMate", "MuseumMate is a robust chatbot that can provide information on every exhibit, artifact, and archive found in the Niagara on the Lake (NOTL) Museum, as well as give detailed directions for guests to find any exhibit or facility within the museum."],
["NOTL Museum", `The Niagara Historical Society was established in 1895 to foster an appreciation of Niagara-on-the-Lake's rich heritage. Within a year, the Society had a significant collection of artefacts that it decided to open a Museum in the local Courthouse. In 1907, under the leadership of the Society’s President, Janet Carnochan, they opened Memorial Hall, Ontario’s first purpose-built Museum.
The NOTL Museum acknowledges that we are operating on lands that have been inhabited by Indigenous people for millennia and would like to honor all the centuries of Indigenous Peoples who have walked on Turtle Island before us. We are grateful for the opportunity to live, work and play here in Niagara-on-the-Lake and we give thanks to the ancestors who have served as stewards of this special place. Today, we have a responsibility to live in balance and harmony with each other and all living things, so that our 7th generation will be able to enjoy these beautiful lands as well!
Today, the Niagara Historical Society continues to promote and preserve our local heritage by owning and operating the Niagara-on-the-Lake Museum. The site now consists of three independent buildings that are merged together. The three buildings are: The High School building (1875), Memorial Hall (1907) and the Link Building (1971).
The Niagara-on-the-Lake Museum contains one of Ontario's most important local history collections. Located 20km north of Niagara Falls, Niagara-on-the-Lake was an important home and terminus for Indigenous peoples, provided a safe haven for refugees and United Empire Loyalists, was the capital of Upper Canada, was in the middle of a war zone and visited by millions as a place of recreation for over 160 years. These stories play a major role in the development of Canada. The galleries host a permanent exhibition, titled Our Story, chronicling the history of our community. Two temporary exhibitions are mounted each year and over 80 engaging programs are enjoyed by the young and the young at heart.`],
["Operating Hours", `Monday 1p.m.-5p.m., Tuesday 1p.m. - 5p.m., Wednesday 1p.m. - 5p.m., Thursday 1p.m. - 5p.m., Friday 1p.m. - 5p.m., Saturday 1p.m. - 5p.m., Sunday 1p.m. - 5p.m.
The museum is closed on the following holidays: Good Friday, Easter Sunday, Thanksgiving day, and during the Christmas season between December 18th and January 1st.`],
["Address", "43 Castlereagh St, Niagara-on-the-Lake, ON L0S 1J0, Canada"],
["Contact", `Phone (905) 468-3912
Fax (905) 468 1728
Email contact@nhsm.ca`],
["Facilities", "Is wheelchair accessable and has ramps and an elevator. There is also a washroom on site"]];

// Few-shot training data for identifying the conversation type
export var _conTypeExamples = `Examples:
Input: Can you give me directions to the Niagara Falls History Museum?
Output: Yes
Input: Which is the quickest route to the Fort Erie Peace Bridge from here?
Output: Yes
Input: How do I get to the battlefield of the War of 1812?
Output: Yes
Input: How do I get to the washroom from the desk?
Output: Yes

Input: What is the address of the museum?
Output: No
Input: Can you give me information about the cannon used in the Battle of Lundy's Lane?
Output: No
Input: Who is Sir Isaac Brock?
Output: No
Input: What is the history behind Laura Secord's trek during the War of 1812?
Output: No
Input: Can you tell me about the significance of the Brock Monument at Queenston Heights?
Output: No
`

// Few-shot training data for identifying subjects
export var _subIdentExamples = `Input: What are the operating hours of the Niagara on the Lake Museum?
Output: Operating Hours

Input: Can you provide me with the contact information for MuseumMate?
Output: Contact

Input: Tell me about the Niagara on the Lake Museum.
Output: Niagara on the Lake Museum

Input: What are the facilities available at the museum?
Output: Facilities

Input: Can you tell me about the history of "Brock's Monument" in the museum?
Output: Brock's Monument

Input: Hi, how are you?
Output: General conversation

Input: Is Niagara on the Lake located in Ontario?
Output: General conversation

Input: What is the address of the Niagara on the Lake Museum?
Output: Address

Input: Can you tell me about the War of 1812 exhibit?
Output: War of 1812 exhibit

Input: Do you have any information about the local wineries in Niagara on the Lake?
Output: General conversation
`

// Few-shot training data for identifying start points
export var _startIdentExamples = `Prompt: How do I get to the Washroom from the Isaac Brock artifact?
StartPoint: Isaac Brock artifact

Prompt: I am at the Lyall Family Ledger, how do I get to the lobby?
StartPoint: Lyall Family Ledger

Prompt: How do I get to the Boat Exhibit?
StartPoint: N/A

Prompt: I am currently at the WWII exhibit.
StartPoint: WWII exhibit

`

// Few-shot training data for identifying end points
export var _endIdentExamples = `Prompt: How do I get to the Washroom from the Isaac Brock artifact?
EndPoint: Washroom

Prompt: I am at the Lyall Family Ledger, how do I get to the Lobby?
EndPoint: Lobby

Prompt: How do I get to the Boat Exhibit?
EndPoint: Boat Exhibit

Prompt: I am currently at the WWII exhibit.
EndPoint: N/A

`