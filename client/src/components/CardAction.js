import React from 'react';

const CardAction = props => {
  const { handleCheckCall, handleFold, handleRaise } = props;
  const [raise, setRaise] = React.useState(0);
  const [display, setDisplay] = React.useState({
    check: 'check  call',
    fold: 'check\nfold',
    raise: 'raise',
  });

  return (
    <div className="card-actions">
      <div className="action-button" id="fold" onClick={handleFold}>
        <p>{display.fold} </p>
      </div>
      <div className="action-button" id="checkCall" onClick={handleCheckCall}>
        {display.check}
      </div>
      <div
        className="action-button"
        id="raise"
        onClick={e => handleRaise(e, raise)}
      >
        {display.raise}
      </div>
      <div className="raise-choose">
        <input
          type="range"
          min="1"
          max="100"
          value="50"
          className="raise-slider"
        />
        <input
          className="raise-input"
          onChange={e => setRaise(e.target.value)}
          type="text"
        />
      </div>
    </div>
  );
};

export default CardAction;