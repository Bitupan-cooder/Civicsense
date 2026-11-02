// Markup converted 1:1 from the original index.html (React migration, step 1).
import manPlantingImg from '../../../Flat Assets/civic/man-planting.png';

export function Stats() {
  return (
    <section className="stats" id="stats">
      {" "}
      <div className="sq-field" data-count="22" aria-hidden="true" />
      {" "}
      <div className="tree-wrap">
        {" "}
        <img id="tree" src={manPlantingImg} alt="Student planting sapling" />
        {" "}
      </div>
      {" "}
      <div className="stats-inner">
        {" "}
        <h2 className="h2 stats-heading">
          Every issue resolved,
          <br />
          <em style={{ fontStyle: "italic", color: "var(--olive)", fontWeight: "700" }}>
            transparently on record.
          </em>
        </h2>
        {" "}
        <div className="cards" id="statsCards">
          {" "}
          <div className="card" data-to="20" data-dec="0" data-suf="">
            {" "}
            <span className="card-label">
              Issue Categories
            </span>
            {" "}
            <b className="card-value">
              20
            </b>
            {" "}
          </div>
          {" "}
          <div className="card" data-to="2" data-dec="0" data-suf="">
            {" "}
            <span className="card-label">
              Languages
            </span>
            {" "}
            <b className="card-value">
              2
            </b>
            {" "}
          </div>
          {" "}
          <div className="card" data-to="4" data-dec="0" data-suf="">
            {" "}
            <span className="card-label">
              Priority Levels
            </span>
            {" "}
            <b className="card-value">
              4
            </b>
            {" "}
          </div>
          {" "}
          <div className="card" data-to="1" data-dec="0" data-suf="">
            {" "}
            <span className="card-label">
              Trackable Complaint
            </span>
            {" "}
            <b className="card-value">
              1
            </b>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div className="cards-shadow" />
        {" "}
        <div className="logos-wrap">
          {" "}
          <div className="logos">
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              PHE · Plumbing
            </span>
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              Electrical
            </span>
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              Wi-Fi
            </span>
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              Security
            </span>
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              Hostels Board
            </span>
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              Academic Labs
            </span>
            {" "}
            <span className="logo-item">
              <span className="logo-dot" />
              Sanitation
            </span>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
  );
}
