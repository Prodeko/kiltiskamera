import React from 'react';

const App = () => {
  return(
    <div className='flex flex-col lg:grid lg:grid-cols-[5fr_2fr] lg:grid-rows-[1fr_auto_5fr] h-screen bg-violet-500'>
      <div className='bg-green-500 aspect-video'>Video</div> {/*Video*/}
      <div className='bg-violet-500 flex-shrink'>Toolbar</div> {/*Reactions*/}
      <div className='bg-blue-500 flex-grow lg:col-start-2 lg:col-end-3 lg:row-span-full'>Chat</div> {/*Chat*/}
    </div>
  )
}

export default App;
