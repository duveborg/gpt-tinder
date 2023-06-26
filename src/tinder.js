import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';

axios.defaults.headers.common['X-Auth-Token'] =
  '';

const configuration = new Configuration({
  apiKey: '',
});
const openai = new OpenAIApi(configuration);

const fetchUser = async () => {
  try {
    const response = await axios.get(`https://api.gotinder.com/v2/profile?locale=en&include=user`);
    return response.data.data.user;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
  }
};

const user = await fetchUser();
const userId = user._id;

const fetchMatches = async (message) => {
  try {
    const response = await axios.get(
      `https://api.gotinder.com/v2/matches?count=100&message=${message ? 1 : 0}`
    );
    return response.data.data.matches;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
  }
};

const fetchmessages = async (matchId) => {
  try {
    const response = await axios.get(
      `https://api.gotinder.com/v2/matches/${matchId}/messages?count=10`
    );
    return response.data.data.messages;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
  }
};

const generateMessage = async (prompt) => {
  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt,
    temperature: 1,
    max_tokens: 1500,
  });

  return completion.data.choices[0].text.trim();
};

const sendMessage = async (matchId, message) => {
  console.log(message + '\n\n');
  try {
    const response = await axios.post(
      `https://api.gotinder.com/user/matches/${matchId}`,
      {
        userId,
        matchId,
        sessionId: null,
        message,
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
  }
};

const newMatches = await fetchMatches(false);
const existingMatches = await fetchMatches(true);

[...newMatches, ...existingMatches].forEach(async (match) => {
  const hasMessages = !!match.messages.length;

  if (hasMessages) {
    const hasUnrepliedMessage = match.messages[0].from !== userId;
    console.log('Has message without reply', hasUnrepliedMessage);
    if (hasUnrepliedMessage) {
      const messages = await fetchmessages(match.id);
      const messageTexts = messages.reverse();

      const reply = await generateMessage(
        `Det här är min konversation på tinder i jsonformat. Kan du skriva ett svar som passar i konversationen? 
        
        Hur du ska skriva meddelandet:
        - Skriv roligt och lite flörtigt 
        - Meddelande från mig är när fältet "from" har värdet ${userId}
        - Meddelandetexten finns i fältet "message" 
        - Var inte för formell 
        - Börja inte meddelandet med en hälsningsfras 
        - Börja inte svaret med "Svar:" eller liknande
        
        Konversationen är:
        """${JSON.stringify(messageTexts)}"""`
      );
      await sendMessage(match.id, reply);
    }
  } else {
    const name = match.person.name;
    const reply = await generateMessage(
      `Skriv en rolig och flörtig öppningsreplik för en tjej som heter ${name}, som ska skickas via tinder. Var inte för formell.

      Hennes profiltext är: 
      """${match.person.bio}"""`
    );
    await sendMessage(match.id, reply);
  }
});
