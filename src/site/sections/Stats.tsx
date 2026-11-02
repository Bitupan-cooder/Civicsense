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
          <div className="card" data-to="14" data-dec="0" data-suf=" hrs">
            {" "}
            <span className="card-label">
              Avg. Turnaround
            </span>
            {" "}
            <b className="card-value">
              14 hrs
            </b>
            {" "}
          </div>
          {" "}
          <div className="card" data-to="6" data-dec="0" data-suf="">
            {" "}
            <span className="card-label">
              Departments
            </span>
            {" "}
            <b className="card-value">
              6
            </b>
            {" "}
          </div>
          {" "}
          <div className="card" data-to="98" data-dec="0" data-suf="%">
            {" "}
            <span className="card-label">
              Resolution Rate
            </span>
            {" "}
            <b className="card-value">
              98%
            </b>
            {" "}
          </div>
          {" "}
          <div className="card" data-to="60" data-dec="0" data-suf=" s">
            {" "}
            <span className="card-label">
              Time to Report
            </span>
            {" "}
            <b className="card-value">
              60 s
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
