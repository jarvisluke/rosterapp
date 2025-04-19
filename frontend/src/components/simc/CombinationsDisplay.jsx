function CombinationsDisplay({ combinations, characterData, itemsData }) {
  // Check if we have any combinations (including the equipped gear combination)
  const hasCombinations = combinations && combinations.length > 0;
  
  // If no combinations are selected, we still have the equipped gear as a single combination
  const totalCombinations = hasCombinations ? combinations.length : 1;
  const hasAlternatives = hasCombinations && combinations.length > 1;

  return (
    <div className="alert alert-info mb-3">
      <h6 className="alert-heading mb-2">
        Ready to simulate {totalCombinations} {totalCombinations === 1 ? 'combination' : 'combinations'}
      </h6>
      <p className="mb-0 small">
        {hasCombinations && hasAlternatives ? (
          `Including your currently equipped gear and ${combinations.length - 1} ${combinations.length === 2 ? 'alternative' : 'alternatives'}`
        ) : (
          'Using your currently equipped gear only'
        )}
      </p>
    </div>
  );
}

export default CombinationsDisplay;