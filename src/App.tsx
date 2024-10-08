import { ConsolePage } from './pages/ConsolePage';
import './App.scss';
import { VoiceChat } from './pages/VoiceChat';
import SaveName from './pages/SaveName';

function App() {
  return (
    <div data-component="App">
     {/* <SaveName/> */}
    <VoiceChat />
    </div>
  );
}

export default App;
