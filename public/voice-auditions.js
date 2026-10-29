// Never play two auditions over each other.
const players=Array.from(document.querySelectorAll('audio'));
for(const player of players)player.addEventListener('play',()=>{
 for(const other of players)if(other!==player)other.pause();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const player of players)player.pause();});
